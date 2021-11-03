package athenarc.imsi.sdl.service;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.RandomAccessFile;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import athenarc.imsi.sdl.config.Constants;
import athenarc.imsi.sdl.domain.PredefinedMetapath;
import athenarc.imsi.sdl.repository.PredefinedMetapathRepository;
import athenarc.imsi.sdl.service.util.FileUtil;

@Service
public class AnalysisService {

    @Autowired
    private PredefinedMetapathRepository predefinedMetapathRepository;

    private final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    @Async
    public void submit(String id, ArrayList<String> analyses, List<Document> queries, String primaryEntity, int searchK, int t, int targetId, String dataset,
                       String selectField, int edgesThreshold, double prAlpha, double prTol, int simMinValues,
                       String commAlgorithm, double commThreshold, int commStopCriterion, int commMaxSteps, int commNumOfCommunities, double commRatio) throws java.io.IOException, InterruptedException {

        // create folder to store results
        String outputDir = FileUtil.createDir(id);
        String hdfsOutputDir = Constants.HDFS_BASE_PATH + "/" + id;
        String outputLog = FileUtil.getLogfile(id);

        String config = FileUtil.writeConfig(analyses, outputDir, hdfsOutputDir, queries, primaryEntity, searchK, t,
                targetId, dataset, selectField, edgesThreshold, prAlpha, prTol, simMinValues, commAlgorithm, commThreshold, commStopCriterion, commMaxSteps, commNumOfCommunities, commRatio);

        ProcessBuilder pb = new ProcessBuilder();
        pb.command("/bin/bash", Constants.WORKFLOW_DIR + "analysis/analysis.sh", config);

        // redirect ouput to logfile
        File out = new File(outputLog);
        File err = new File(FileUtil.getErrorLog(id));
        
        pb.redirectOutput(out);
        pb.redirectError(err);

        // execute analysis script
        Process process = pb.start();
        int exitCode = process.waitFor();

        // write to file that the job has finished
        FileWriter fileWriter = new FileWriter(outputLog, true);
        PrintWriter printWriter = new PrintWriter(fileWriter);
        printWriter.print("Exit Code\t" + exitCode);
        printWriter.close();

        log.debug("Analysis task for id: " + id + " exited with code: " + exitCode);
    }

    private static void getMeta(Document meta, int totalRecords, int totalPages, int page, String[] headers) {
        meta.append("totalRecords", totalRecords);
        meta.append("page", page);
        meta.append("totalPages", totalPages);
        meta.append("pageSize", Constants.PAGE_SIZE);

        Document links = new Document();
        links.append("hasNext", (page < totalPages) ? true : false);
        links.append("hasPrev", (page > 1) ? true : false);
        meta.append("links", links);
        meta.append("headers", headers);
    }

    public List<Document> getCommunityResults(String analysisFile, Integer page, Document meta) throws IOException {
        if (page == null) {
            page = 1;
        }

        List<Document> docs = new ArrayList<>();
        List<Long> communityPositions = FileUtil.getCommunityPositions(analysisFile);
        int totalRecords = communityPositions.size();
        int totalPages = (int) Math.ceil(((double) totalRecords) / ((double) Constants.PAGE_SIZE));

System.out.println(totalRecords);
System.out.print(totalPages);

        String[] headers = FileUtil.getHeaders(analysisFile);
        int firstCommunityIndex = (page - 1) * Constants.PAGE_SIZE;

        if (firstCommunityIndex < communityPositions.size()) {
            int communityColumnIndex;
            for (communityColumnIndex = 0; communityColumnIndex < headers.length; communityColumnIndex++) {
                if (headers[communityColumnIndex].equals("Community")) break;
            }

            boolean reachEnd = communityPositions.size() <= firstCommunityIndex + Constants.PAGE_SIZE;
            log.debug(reachEnd? "Will reach end":"Will dump 50 entries");
            long communityPositionLimit = reachEnd ? -1 : communityPositions.get(firstCommunityIndex + Constants.PAGE_SIZE);

            RandomAccessFile communityResultsFile = new RandomAccessFile(analysisFile, "r");

            long currentPosition;
            String line = null;
            communityResultsFile.seek(communityPositions.get(firstCommunityIndex));
            do {
                currentPosition = communityResultsFile.getFilePointer();
                if ((currentPosition < communityPositionLimit) || reachEnd) {
                    line = communityResultsFile.readLine();
                    if (line != null) {
                        String[] attributes = line.split("\t");
                        Document doc = new Document();
                        for (int i = 0; i < attributes.length; i++) {
                            doc.append(headers[i], attributes[i]);
                        }
                        docs.add(doc);
                    }
                }
            } while (((currentPosition < communityPositionLimit) || reachEnd) && (line != null));
            communityResultsFile.close();
        }

        AnalysisService.getMeta(meta, totalRecords, totalPages, page, headers);
        meta.append("community_counts", totalRecords);
        return docs;
    }

    public List<Document> getResults(String analysisFile, Integer page, Document meta) throws IOException {
        if (page == null)
            page = 1;

        List<Document> docs = new ArrayList<>();
        int totalRecords = FileUtil.countLines(analysisFile);
        int totalPages = FileUtil.totalPages(totalRecords);
        String[] headers = FileUtil.getHeaders(analysisFile);
        final int firstRecordNumber = (page - 1) * Constants.PAGE_SIZE + 1;

        int count = 0;
        Reader reader = Files.newBufferedReader(Paths.get(analysisFile));
        CSVReader csvReader = new CSVReaderBuilder(reader)
            .withCSVParser(new CSVParserBuilder().withSeparator('\t').build()).withSkipLines(firstRecordNumber)
            .build();

        String[] attributes;
        while (count < Constants.PAGE_SIZE && ((attributes = csvReader.readNext()) != null)) {

            // IMPORTANT: the order of the fields is indicated from the headers array in the
            // metadata section
            Document doc = new Document();
            for (int i = 0; i < attributes.length; i++) {
                doc.append(headers[i], attributes[i]);
            }

            docs.add(doc);
            count++;
        }

        AnalysisService.getMeta(meta, totalRecords, totalPages, page, headers);

        return docs;
    }

    public double getProgress(ArrayList<String> analyses, int stage, float step) {
        int analysesSize = analyses.size();

        // do count combinations Ranking-CD and CD-Ranking as extra analyses in progress
        if (analyses.contains("Ranking") && analyses.contains("Community Detection")) {
            analysesSize -= 2;
        }

        return (step / 3.0) * (100.0 / (analysesSize + 1)) + (stage - 1) * (100.0 / (analysesSize + 1));
    }

    public Document getCommunityCounts(String detailsFile, List<Document> docs)
        throws FileNotFoundException, IOException {
        Document communityCounts = new Document();
        Document counts = Document.parse(FileUtil.readJsonFile(detailsFile));

        // get number of entities of each community in the results
        for (Document doc : docs) {
            System.out.println(doc);
            String entity = (String) doc.get("Community");

            int count = (int) counts.get(entity);
            communityCounts.append(entity, count);
        }

        // add total number of communities
        communityCounts.append("total", (int) counts.get("total"));
        return communityCounts;
    }

    public void updatePredifinedMetapaths(String dataset, String metapathToUpdate, String key, List<String> entities) {

        PredefinedMetapath metapath = predefinedMetapathRepository.findFirstByDatasetAndMetapath(dataset, metapathToUpdate);
        if (metapath != null) {
            metapath.setTimesUsed(metapath.getTimesUsed() + 1);
            predefinedMetapathRepository.save(metapath);
        } else {
            PredefinedMetapath newMetapath = new PredefinedMetapath();
            newMetapath.setDataset(dataset);
            newMetapath.setKey(key);
            newMetapath.setMetapath(metapathToUpdate);
            newMetapath.setEntities(entities);
            newMetapath.setDescription("");
            newMetapath.setTimesUsed(1);
            newMetapath.setShowit(false);
            predefinedMetapathRepository.save(newMetapath);    
        }
    }
    
}

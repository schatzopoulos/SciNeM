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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    public String prepareJobFiles(String id, ArrayList<String> analyses, List<Document> queries, String primaryEntity, int searchK, int t, int targetId, String dataset,
                       String selectField, int edgesThreshold, double prAlpha, double prTol, int simMinValues,
                       String commAlgorithm, double commThreshold, int commStopCriterion, int commMaxSteps, int commNumOfCommunities, double commRatio) throws java.io.IOException, InterruptedException {

        // create folder to store results
        String outputDir = FileUtil.createDir(id);
        String hdfsOutputDir = Constants.HDFS_BASE_PATH + "/" + id;

        String config = FileUtil.writeConfig(analyses, outputDir, hdfsOutputDir, queries, primaryEntity, searchK, t,
                targetId, dataset, selectField, edgesThreshold, prAlpha, prTol, simMinValues, commAlgorithm, commThreshold, commStopCriterion, commMaxSteps, commNumOfCommunities, commRatio);

        // create log files
        File out = new File(FileUtil.getLogfile(id));
        out.createNewFile();

        File err = new File(FileUtil.getErrorLog(id));
        err.createNewFile();

        return config;
    }

    @Async
    public void submitJob(String id, String config)
                        throws java.io.IOException, InterruptedException {

        ProcessBuilder pb = new ProcessBuilder();
        pb.command("/bin/bash", Constants.WORKFLOW_DIR + "analysis/analysis.sh", config);

        // redirect ouput to logfiles
        File out = new File(FileUtil.getLogfile(id));
        File err = new File(FileUtil.getErrorLog(id));

        pb.redirectOutput(out);
        pb.redirectError(err);

        // execute analysis script
        Process process = pb.start();
        int exitCode = process.waitFor();

        // write to file that the job has finished
        FileWriter fileWriter = new FileWriter(out, true);
        PrintWriter printWriter = new PrintWriter(fileWriter);
        printWriter.print("Exit Code\t" + exitCode);
        printWriter.close();

        log.debug("Analysis task for id: " + id + " exited with code: " + exitCode);
    }

    private static void getMeta(Document meta, int totalRecords, int totalPages, int page, String[] headers, String results_type) {
        meta.append("totalRecords", totalRecords);
        meta.append("page", page);
        meta.append("totalPages", totalPages);
        meta.append("pageSize", Constants.PAGE_SIZE);

        Document links = new Document();
        links.append("hasNext", (page < totalPages) ? true : false);
        links.append("hasPrev", (page > 1) ? true : false);
        meta.append("links", links);
        meta.append("headers", headers);
        meta.append("results_type", results_type);
    }

    public List<Document> getHierarchicalCommunityResults(String[] headers, String analysisFile, Integer page, String communityId, Document meta) throws IOException {

        // community and selected field index are defined in that order
        int communityIndex = 0;
        for (communityIndex = 0; communityIndex < headers.length; communityIndex++) {
            if (headers[communityIndex].equals("Community")) break;
        }
        // int nameIndex = 1;

        Reader reader = Files.newBufferedReader(Paths.get(analysisFile));
        CSVReader csvReader = new CSVReaderBuilder(reader)
            .withCSVParser(new CSVParserBuilder().withSeparator('\t').build())
            .build();

        int lineNum = 0;
        Map<String, Document> communities  = new HashMap<>();
        String[] attributes;

        while ((attributes = csvReader.readNext()) != null) {
            lineNum++;

            // skip header 
            if (lineNum == 1)
                continue;

            String[] rowCommunities = attributes[communityIndex].split("-");
            String community = null;

            // communityId is given, therefore we are filtering based on this community in that level
            // and returning its contents one level below
            if (communityId != null) {
                for (int i = 0; i<rowCommunities.length; i++) {
                    
                    // this does not belong to the given community
                    if (!communityId.equals(rowCommunities[i]))
                        continue;

                    // community matches, therefore return communities of one level below
                    else if (i > 0)
                        community = rowCommunities[i - 1]; 

                    // we are in a leaf, return all members of community
                    else {
                        community = "leaf";
                    }
                }

            // if community is not defined return community of the hoghest level
            } else {
                community = rowCommunities[rowCommunities.length-1];
            }

            // row does not match given communityId
            if (community == null) {
                continue;
            }

            Document doc = null;

            // create new community
            if ((doc = communities.get(community)) == null) {

                doc = new Document();
                doc.put("community", community);
                doc.put("count", 0);
                doc.put("members", new ArrayList<Document>());

                communities.put(community, doc);
            }

            // update community count
            doc.put("count", (Integer)doc.get("count")+1);

            // update community members if less that a threshold
            int showMaxMembers = 5;
            List<Document> members = (List<Document>)doc.get("members");

            // return only first max members in internal nodes
            // when we are reach leaf-levle return all members
            if (members.size() < showMaxMembers || community.equals("leaf")) {
                Document newMember = new Document();
                for (int i = 0; i < attributes.length; i++) {
                    newMember.append(headers[i], attributes[i]);
                }
                members.add(newMember);
                doc.put("members", members);         
            }
        }
        List<Document> docs = new ArrayList<Document>(communities.values());

        int communitiesCount = communities.size();
        int totalPages = (int) Math.ceil(((double) communitiesCount) / ((double) Constants.PAGE_SIZE));
        AnalysisService.getMeta(meta, communitiesCount, totalPages, page, headers, "hierarchical");
        meta.append("community_id", communityId);
        meta.append("community_counts", communitiesCount);

        return docs;
    }

    public List<Document> getFlatCommunityResults(String[] headers, String analysisFile, Integer page, Document meta) throws IOException {
        List<Document> docs = new ArrayList<>();
        List<Long> communityPositions = FileUtil.getCommunityPositions(analysisFile);
        int totalRecords = communityPositions.size();
        int totalPages = (int) Math.ceil(((double) totalRecords) / ((double) Constants.PAGE_SIZE));
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

        AnalysisService.getMeta(meta, totalRecords, totalPages, page, headers, "flat");
        meta.append("community_counts", totalRecords);
        return docs;
    }

    public List<Document> getResults(String analysisFile, Integer page, Document meta) throws IOException {

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

            // IMPORTANT: the order of the fields is indicated by the headers array in metadata section
            Document doc = new Document();
            for (int i = 0; i < attributes.length; i++) {
                doc.append(headers[i], attributes[i]);
            }

            docs.add(doc);
            count++;
        }

        AnalysisService.getMeta(meta, totalRecords, totalPages, page, headers, "flat");

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

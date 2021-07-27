package athenarc.imsi.sdl.service.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.LineNumberReader;
import java.io.PrintWriter;
import java.io.RandomAccessFile;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.bson.Document;

import athenarc.imsi.sdl.config.Constants;

/**
 * Utility class for file and dir management.
 */
public final class FileUtil {


    private FileUtil() {
    }

    public static String createDir(String uuid) {
        String dirname = Constants.BASE_PATH + "/" + uuid;
        File dir = new File(dirname);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dirname;
    }

    public static Boolean dirExists(String uuid) {
        String dirname = Constants.BASE_PATH + "/" + uuid;
        File dir = new File(dirname);
        return dir.exists();
    }

    public static String getLogfile(String uuid) {
        return Constants.BASE_PATH + "/" + uuid + "/log.out";
    }

    public static String getConfFile(String uuid) {
        return Constants.BASE_PATH + "/" + uuid + "/" + Constants.CONFIG_FILE;
    }

    public static String getOutputFile(String uuid, String analysis) {
        String resultsFile = Constants.BASE_PATH + "/" + uuid + "/";

        if (analysis.equals("Ranking")) {
            resultsFile += Constants.FINAL_RANKING_OUT;
        } else if (analysis.equals("Community Detection")) {
            resultsFile += Constants.FINAL_COMMUNITY_OUT;
        } else if (analysis.equals("Similarity Join")) {
            resultsFile += Constants.FINAL_SIM_JOIN_OUT;
        } else if (analysis.equals("Similarity Search")) {
            resultsFile += Constants.FINAL_SIM_SEARCH_OUT;
        } else if (analysis.equals("Ranking - Community Detection")) {
            resultsFile += Constants.RANKING_COMMUNITY_OUT;
        } else if (analysis.equals("Community Detection - Ranking")) {
            resultsFile += Constants.COMMUNITY_RANKING_OUT;
        }

        return resultsFile;
    }

    public static String getCommunityDetailsFile(String uuid) {
        return Constants.BASE_PATH + "/" + uuid + "/" + Constants.COMMUNITY_DETAILS;
    }


    public static Document parseLogfile(String logfile) throws IOException {
        String lastLine = "";
        Integer stageNum = 0;
        String prevAnalysis = "";
        String sCurrentLine;
        ArrayList<String> completedStages = new ArrayList<>();

        BufferedReader br = new BufferedReader(new FileReader(logfile));

        while ((sCurrentLine = br.readLine()) != null) {
            String[] tokens = sCurrentLine.split("\\t");
            lastLine = sCurrentLine;

            if (tokens.length != 3) // in case of last line with exit code
                continue;

            if (!tokens[0].equals(prevAnalysis)) {
                prevAnalysis = tokens[0];
                stageNum++;
            }

            // return stages that have been completed
            if (tokens[2].equals("Completed")) {
                completedStages.add(tokens[0]);
            }
        }

        br.close();
        return new Document()
            .append("lastLine", lastLine)
            .append("stageNum", stageNum)
            .append("completedStages", completedStages);
    }

    public static String writeConfig(
        ArrayList<String> analyses,
        String outputDir,
        String hdfsOutputDir,
        String metapath,
        String joinpath,
        Document constraints,
        String constraintsExpression,
        String primaryEntity,
        int searchK,
        int t,
        int targetId,
        String dataset,
        String selectField,
        int edgesThreshold,
        double prAlpha,
        double prTol,
        int simMinValues,
        int lpaIter
    ) throws IOException {

        Document config = new Document();

        // Input & Output files configuration
        config.put("indir", Constants.HDFS_DATA_DIR + dataset + "/nodes/");
        config.put("irdir", Constants.HDFS_DATA_DIR + dataset + "/relations/");
        config.put("indir_local", Constants.DATA_DIR + dataset + "/nodes/");

        config.put("hin_out", hdfsOutputDir + "/" + Constants.HIN_OUT);
        config.put("join_hin_out", hdfsOutputDir + "/" + Constants.JOIN_HIN_OUT);

        config.put("hdfs_out_dir", hdfsOutputDir);
        config.put("local_out_dir", outputDir);
			
        config.put("ranking_out", hdfsOutputDir + "/" + Constants.RANKING_OUT);
        config.put("communities_out", hdfsOutputDir + "/" + Constants.COMMUNITY_DETECTION_OUT);
        config.put("communities_details", outputDir + "/" + Constants.COMMUNITY_DETAILS);

        config.put("sim_search_out", hdfsOutputDir + "/" + Constants.SIM_SEARCH_OUT);
        config.put("sim_join_out", hdfsOutputDir + "/" + Constants.SIM_JOIN_OUT);

        config.put("final_ranking_out", outputDir + "/" + Constants.FINAL_RANKING_OUT);
        config.put("final_communities_out", outputDir + "/" + Constants.FINAL_COMMUNITY_OUT);
        config.put("final_sim_search_out", outputDir + "/" + Constants.FINAL_SIM_SEARCH_OUT);
        config.put("final_sim_join_out", outputDir + "/" + Constants.FINAL_SIM_JOIN_OUT);

        config.put("final_ranking_community_out", outputDir + "/" + Constants.RANKING_COMMUNITY_OUT);
        config.put("final_community_ranking_out", outputDir + "/" + Constants.COMMUNITY_RANKING_OUT);

        config.put("dataset", dataset);
        config.put("primary_entity", primaryEntity);
        config.put("select_field", selectField);

        // Ranking params
        config.put("analyses", analyses);
        config.put("pr_alpha", prAlpha);
        config.put("pr_tol", prTol);
        config.put("edgesThreshold", edgesThreshold);

        // Similarity Search & Join params
        config.put("target_id", targetId);
        config.put("searchK", searchK);

        config.put("t", t);
        config.put("sim_min_values", simMinValues);
        config.put("community_detection_iter", lpaIter);

        // Query specific params
        Document query = new Document();
        query.put("metapath", metapath);
        query.put("joinpath", joinpath);
        query.put("constraints", constraints);
        query.put("constraintsExpression", constraintsExpression);

        config.put("query", query);

        // write json to config file
        String configFile = outputDir + "/" + Constants.CONFIG_FILE;
        FileWriter fileWriter = new FileWriter(configFile);
        PrintWriter printWriter = new PrintWriter(fileWriter);
        printWriter.print(config.toJson());
        printWriter.close();

        return configFile;
    }

    public static String[] getHeaders(String filename) throws FileNotFoundException, IOException {
        BufferedReader bf = new BufferedReader(new FileReader(filename));
        String firstLine = bf.readLine();
        String[] headers = firstLine.split("\t");
        bf.close();
        return headers;
    }

    public static int countLines(String filename) throws FileNotFoundException, IOException {
        FileReader input = new FileReader(filename);
        LineNumberReader count = new LineNumberReader(input);
        while (count.skip(Long.MAX_VALUE) > 0) {
        }
        int result = count.getLineNumber();
        count.close();
        return result - 1;    //remove header
    }

    public static int totalPages(int totalRecords) {
        int totalPages = (int) (totalRecords / Constants.PAGE_SIZE);
        if (totalRecords % Constants.PAGE_SIZE > 0) {
            totalPages++; // increase totalPages if there's a division remainder
        }
        return totalPages;
    }

    public static int unzip(String zipFile) throws java.io.IOException, InterruptedException {

        ProcessBuilder pb = new ProcessBuilder();
        pb.command("unzip", "-n", zipFile, "-d", Constants.DATA_DIR);
        Process process = pb.start();
        return process.waitFor();
    }

    public static List<String> getLocalDatasets() {
        File file = new File(Constants.DATA_DIR);
        String[] directories = file.list(new FilenameFilter() {
          @Override
          public boolean accept(File current, String name) {
            return new File(current, name).isDirectory();
          }
        });
        return Arrays.asList(directories);
    }

    public static int copyToHdfs(String dataset) throws java.io.IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder();
        pb.command("hadoop", "dfs", "-put", Constants.DATA_DIR + dataset, Constants.HDFS_DATA_DIR);
        Process process = pb.start();
        return process.waitFor();
    }

    public static boolean remove(String filename) {
        File file = new File(filename);
        return file.delete();
    }

    public static String[] findSubdirectories(String rootDir) {
        return new File(rootDir).list(new FilenameFilter() {
            @Override
            public boolean accept(File current, String name) {
                return new File(current, name).isDirectory();
            }
        });
    }

    public static String readJsonFile(String filename) throws FileNotFoundException, IOException {
        File file = new File(filename);
        FileInputStream fis = new FileInputStream(file);
        byte[] data = new byte[(int) file.length()];
        fis.read(data);
        fis.close();
        return new String(data, "UTF-8");
    }

    public static Document getAnalysesParameters(final Document config) {
        ArrayList<String> ananyses = (ArrayList<String>) config.get("analyses");

        Document query = (Document) config.get("query");
        String metapath = (String) query.get("metapath");

        ArrayList<String> constraints = new ArrayList<>();
        for (final Map.Entry<String, Object> entry : ((Document) query.get("constraints")).entrySet()) {
            constraints.add(entry.getKey() + ": " + ((String) entry.getValue()));
        }

        Document analysisParameters = new Document();
        analysisParameters.append("analyses", ananyses);
        analysisParameters.append("metapath", metapath);
        analysisParameters.append("constraints", constraints);

        return analysisParameters;
    }

    public static List<Long> getCommunityPositions(String file) throws IOException {
        Set<String> communityIdsSet = new HashSet<>();
        List<Long> communityPositions = new ArrayList<>();
        RandomAccessFile communityFile = new RandomAccessFile(file, "r");
        String[] headers = communityFile.readLine().split("\t");
        int communityColumnIndex;
        for (communityColumnIndex = 0; communityColumnIndex < headers.length; communityColumnIndex++) {
            if (headers[communityColumnIndex].equals("Community")) break;
        }

        String line;
        do {
            long linePosition = communityFile.getFilePointer();
            line = communityFile.readLine();
            if (line != null) {
                String communityId = line.split("\t")[communityColumnIndex];

                if (!communityIdsSet.contains(communityId)) {
                    communityIdsSet.add(communityId);
                    communityPositions.add(linePosition);
                }
            }
        } while (line!=null);

        return communityPositions;
    }
}

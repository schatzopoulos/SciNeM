package athenarc.imsi.sdl.web.rest;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import javax.validation.Valid;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import athenarc.imsi.sdl.service.AnalysisService;
import athenarc.imsi.sdl.service.util.FileUtil;
import athenarc.imsi.sdl.service.util.RandomUtil;
import athenarc.imsi.sdl.web.rest.vm.QueryConfigVM;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;
import io.swagger.annotations.Example;
import io.swagger.annotations.ExampleProperty;

/**
 * RankingResource controller
 */
@RestController
@RequestMapping("/api/analysis")
public class AnalysisResource {

    private final Logger log = LoggerFactory.getLogger(AnalysisResource.class);

    @Autowired
    private final AnalysisService analysisService = new AnalysisService();

    /**
     * POST submit
     */
    @ApiOperation(value = "Used to submit a new analysis")
    @ApiResponses(value =
        {
            @ApiResponse(code = 200, message = "The analysis was successfully submitted"),
            @ApiResponse(code = 400, message = "Bad request")
        }
    )
    @PostMapping(value = "/submit", produces = "application/json;charset=UTF-8")
    public Document submit(@Valid @RequestBody QueryConfigVM config) {
        String id = UUID.randomUUID().toString();
        log.debug("Analysis task submitted with id: " + id);

        ArrayList<String> analyses = config.getAnalysis();
        if (analyses.contains("Ranking") && analyses.contains("Community Detection")) {
            analyses.add("Ranking - Community Detection");
            analyses.add("Community Detection - Ranking");
            config.setAnalysis(analyses);
        }

        try {

            // update predefined metapaths
            for (QueryConfigVM.Query query : config.getQueries()) {
                analysisService.updatePredifinedMetapaths(
                    config.getDataset(),
                    query.getMetapath(),
                    config.getSelectField(),
                    query.getEntities()
                );
            }

            // INFO: copy query data; needed as services should not depend on web resources like QueryConfigVM
            List<Document> queries = new ArrayList<>();
            for (QueryConfigVM.Query query : config.getQueries()) {
                Document doc = new Document();
                doc.append("metapath", query.getMetapath());
                doc.append("joinpath", query.getJoinpath());
                doc.append("constraints", query.getConstraints());
                doc.append("constraintsExpression", query.getConstraintsExpression());
                doc.append("entities", query.getEntities());

                queries.add(doc);
            }

            String configPath = analysisService.prepareJobFiles(
                id,
                config.getAnalysis(),
                queries,
                config.getPrimaryEntity(),
                config.getSearchK(),
                config.getT(),
                config.getTargetId(),
                config.getDataset(),
                config.getSelectField(),
                config.getEdgesThreshold(),
                config.getPrAlpha(),
                config.getPrTol(),
                config.getSimMinValues(),
                config.getCommAlgorithm(),
                config.getCommThreshold(),
                config.getCommStopCriterion(),
                config.getCommMaxSteps(),
                config.getCommNumOfCommunities(),
                config.getCommRatio()
            );

            // submit async job
            analysisService.submitJob(id, configPath);

        } catch (java.io.IOException | InterruptedException e) {
            throw new RuntimeException("Error running ranking task: " + id);
        }
        return new Document("id", id).append("analysis", config.getAnalysis());
    }

    @ApiOperation(value = "Retrieves the status of a submitted analysis")
    @ApiResponses(value =
        {
            @ApiResponse(code = 200, message = "The analysis was found and its status was successfully retrieved", examples = @Example(@ExampleProperty(value = "da", mediaType = "dadwad"))),
            @ApiResponse(code = 400, message = "Bad request")
        }
    )
    @GetMapping(value = "/status", produces = "application/json;charset=UTF-8")
    public Document status(
        @ApiParam(value = "The ID that was assigned on the analysis in question, during submission", required = true) @RequestParam  String id) {
        log.debug("analysis/status : {}", id);

        Document response = new Document();
        response.append("id", id);

        try {
            // parse config file
            String conf = FileUtil.readJsonFile(FileUtil.getConfFile(id));
            Document config = Document.parse(conf);
            ArrayList<String> analyses = (ArrayList<String>) config.get("analyses");

            // parse log file
            String logfile = FileUtil.getLogfile(id);
            Document logInfo = FileUtil.parseLogfile(logfile);
            String lastLine = (String) logInfo.get("lastLine");

            ArrayList<String> completedStages = (ArrayList<String>) logInfo.get("completedStages");

            // determine analyses that have been completed
            Document completed = new Document();
            for (String analysis : analyses) {
                completed.append(analysis, completedStages.contains(analysis));
            }
            response.append("completed", completed);

            // form description of analysis
            String description = RandomUtil.getAnalysisDescription(config, false);
            response.append("description", description);

            String[] tokens = lastLine.split("\t");

            if (tokens[0].equals("Exit Code") && !tokens[1].equals("0")) {

                // set all analyses as completed, in order to stop loading on frontend
                Document comp = new Document();
                for (String analysis : analyses) {
                    completed.append(analysis, true);
                }
                response.append("completed", comp);
                if (tokens[1].equals("100")) {
                    response.append("description", "Warning: The produced HIN view does not contain any entities; please try again with more loose constrains.");
                } else if (tokens[1].equals("200")) {
                    response.append("description", "Warning: Due to limited resources the analysis was aborted as a large HIN view was created; please try again with more strict constraints.");
                } else {
                    throw new RuntimeException("Error in analysis task: " + id);
                }
            } else if (tokens.length == 3) {
                response.append("stage", tokens[0])
                    .append("step", tokens[2])
                    .append("progress", analysisService.getProgress(analyses, (Integer) logInfo.get("stageNum"), Float.parseFloat(tokens[1])));

            // in case logfile is still empty
            } else {
                response.append("stage", "HIN Transformation")
                    .append("step", "Initializing")
                    .append("progress", 0);
            }

        } catch (IOException e) {
            throw new RuntimeException("Error reading status from logfile");
        }
        return response;

    }

    /**
     * GET status
     */
    @ApiOperation(value = "Retrieves the results for a given analysis")
    @ApiResponses(value =
        {
            @ApiResponse(code = 200, message = "The analysis was found and the results were successfully retrieved"),
            @ApiResponse(code = 400, message = "Bad request")
        }
    )
    @GetMapping(value = "/get", produces = "application/json;charset=UTF-8")
    public Document get(
        @ApiParam(value = "The ID that was assigned on the analysis in question, during submission", required = true) @RequestParam String id,
        @ApiParam(value = "The type of the analysis", required = true) @RequestParam String analysis,
        @ApiParam(value = "A value N greater or equal to 1 that is used to retrieve the [(N-1)*50,N*50) results") @RequestParam(required = false, defaultValue = "1") Integer page, 
        @ApiParam(value = "Applies hierarchical results: indicates the community for which its members are requested") @RequestParam(required = false) String communityId
    ) {
        log.debug("analysis/get : {}", id, analysis, page);

        String logfile = FileUtil.getLogfile(id);

        try {
            Document logInfo = FileUtil.parseLogfile(logfile);
            String lastLine = (String) logInfo.get("lastLine");

            // throw error if analaysis was aborted with an error code
            int index = lastLine.indexOf("Exit Code");
            Document response = new Document();
            if (index >= 0) {
                int exitCode = Integer.parseInt(lastLine.split("\t")[1]);

                // error occurred in ranking script
                if (exitCode != 0) {
                    throw new RuntimeException("Error in analysis task: " + id);
                }
            }

            String resultsFile = FileUtil.getOutputFile(id, analysis);

            try {
                String configurationFilePath = FileUtil.getConfFile(id);
                Document configuration = Document.parse(FileUtil.readJsonFile(configurationFilePath));

                Document meta = new Document();
                List<Document> docs;
                if (analysis.startsWith("Community Detection")) {
                    String communityAlgorithm = (String) configuration.get("community_algorithm");
                    String[] headers = FileUtil.getHeaders(resultsFile);

                    if (communityAlgorithm.equals("HPIC")) {
                        docs = analysisService.getHierarchicalCommunityResults(headers, resultsFile, page, communityId, meta);
                    } else {
                        docs = analysisService.getFlatCommunityResults(headers, resultsFile, page, meta);
                    }
                    
                } else {
                    docs = analysisService.getResults(resultsFile, page, meta);
                    // if (analysis.contains("Community")) {
                    //     String communityDetailsFile = FileUtil.getCommunityDetailsFile(id);
                    //     Document communityCounts = analysisService.getCommunityCounts(communityDetailsFile, docs);
                    //     meta.append("community_counts", communityCounts);
                    // }
                }

                String selectField = (String) configuration.get("select_field");
                String dataset = (String) configuration.get("dataset");
                String primaryEntiry = (String) configuration.get("primary_entity");
                Document analysisDomain = new Document();

                analysisDomain.append("selectField", selectField);
                analysisDomain.append("dataset", dataset);
                analysisDomain.append("entity", primaryEntiry);
                meta.append("analysis_domain", analysisDomain);

                Document hin = null;
                if (analysis.equals("Ranking")) {
                    String fileName = "RANKING_HIN_SCHEMA.json";
                    String targetHinJsonFilePath = Paths.get((String) configuration.get("local_out_dir"), fileName).toString();
                    // check if hin json exists
                    File targetHinJsonFile = new File(targetHinJsonFilePath);
                    if (targetHinJsonFile.exists()) {
                        // if it does load it
                        hin = Document.parse(FileUtil.readJsonFile(targetHinJsonFilePath));
                    }
                }

                // send description in the response to include it in the results
                String conf = FileUtil.readJsonFile(FileUtil.getConfFile(id));
                Document config = Document.parse(conf);
                String description = RandomUtil.getAnalysisDescription(config, true);

                response.append("id", id)
                    .append("analysis", analysis)
                    .append("description", description)
                    .append("_meta", meta)
                    .append("docs", docs);

                if (hin != null && (page == null || !(page > 1))) {
                    response.append("hin", hin);
                }

            } catch (IOException e) {
                throw new RuntimeException("Error results from file");
            }

            return response;
        } catch (IOException e) {
            throw new RuntimeException("Error reading status from logfile");
        }
    }

    /**
     * GET analysis exists
     */
    @ApiOperation(value = "Checks whether an analysis with the given ID exists")
    @ApiResponses(value =
        {
            @ApiResponse(code = 200, message = "The analysis was found and the corresponding analysis types are returned"),
            @ApiResponse(code = 400, message = "Bad request")
        }
    )
    @GetMapping(value = "/exists", produces = "application/json;charset=UTF-8")
    public ResponseEntity<Document> exists(
        @ApiParam(value = "The ID that was assigned to the analysis in question, during submission", required = true) @RequestParam String id) {
        log.debug("analysis/exists : {}", id);

        Boolean exists = FileUtil.dirExists(id);
        try {
            // parse config file
            String conf = FileUtil.readJsonFile(FileUtil.getConfFile(id));
            Document config = Document.parse(conf);
            ArrayList<String> analyses = (ArrayList<String>) config.get("analyses");
            Document content = new Document().append("id", id).append("exists", exists).append("analysis", analyses);

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/json;charset=UTF-8"))
                .body(content);

        } catch (IOException e) {
            throw new RuntimeException("Error reading status from logfile");
        }

    }

}

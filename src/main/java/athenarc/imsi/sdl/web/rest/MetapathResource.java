package athenarc.imsi.sdl.web.rest;

import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import athenarc.imsi.sdl.config.Constants;
import athenarc.imsi.sdl.service.MetapathService;
import athenarc.imsi.sdl.service.util.FileUtil;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;

@RestController
@RequestMapping("/api/metapath")
public class MetapathResource {

    private final Logger log = LoggerFactory.getLogger(MetapathResource.class);

    @Autowired
    private MetapathService metapathService;

    @ApiOperation(value="This method is used to retrieve any available predefined metapaths for a given dataset")
    @ApiResponses(value =
        {
            @ApiResponse(code = 200, message = "Successfully found dataset and retrieved a list with predefined metapath information. An empty list means no predefined metapaths exist for the given dataset."),
            @ApiResponse(code = 400, message = "Bad request"),
            @ApiResponse(code = 404, message = "Given dataset does not exist")
        }
    )
    @GetMapping(value = "/predefined", produces = "application/json;charset=UTF-8")
    public Document getPredefinedMetapaths(@ApiParam(value="The dataset for which to search predefined metapaths", required = true) @RequestParam String dataset) {

        // check if this is a valid dataset
        String[] availableDatasets = FileUtil.findSubdirectories(Constants.DATA_DIR);
        if (!Arrays.asList(availableDatasets).contains(dataset)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset '" + dataset + "' does not exist");
        }

        List<Document> predefinedMetapaths = metapathService.getPredefinedMetapaths(dataset);
        
        if (predefinedMetapaths == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No predfined metapath exist for this dataset");
        }
        
        Document response = new Document()
            .append("dataset", dataset)
            .append("predefinedMetapaths", predefinedMetapaths);

        return response;
    }

    @ApiOperation(value="This method is used to retrieve the description for a specific metapath, of a specific dataset")
    @ApiResponses(value =
        {
            @ApiResponse(code = 200, message = "Successfully found dataset and retrieved a string describing the metapath. If the string is empty, no description exists for the given metapath."),
            @ApiResponse(code = 400, message = "Bad request"),
            @ApiResponse(code = 404, message = "Given dataset does not exist")
        }
    )
    @GetMapping(value = "/description", produces = "application/json;charset=UTF-8")
    public Document getMetapathDescription(
        @ApiParam(value="The dataset for which to search predefined metapaths", required=true) @RequestParam String dataset,
        @ApiParam(value="Full name of entities that define the metapath. The metapath is defined by the order of entity definition", required = true) @RequestParam List<String> entities) {

        String[] availableDatasets = FileUtil.findSubdirectories(Constants.DATA_DIR);
        if (!Arrays.asList(availableDatasets).contains(dataset)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset '" + dataset + "' does not exist");
        }

        String retrievedDescription = metapathService.getMetapathDescription(dataset, entities);
        if (retrievedDescription == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No description exists for this metapath");
        }

        Document metapathInfo = new Document()
            .append("dataset", dataset)
            .append("entities", entities)
            .append("metapathDescription", retrievedDescription);
        return metapathInfo;
    }
}

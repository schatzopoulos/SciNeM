package athenarc.imsi.sdl.service;

import java.util.LinkedList;
import java.util.List;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import athenarc.imsi.sdl.domain.PredefinedMetapath;
import athenarc.imsi.sdl.repository.PredefinedMetapathRepository;

@Service
public class MetapathService {

    @Autowired
    private PredefinedMetapathRepository predefinedMetapathRepository;

    public List<Document> getPredefinedMetapaths(String dataset) {

        List<Document> predefinedMetapaths = new LinkedList<Document>();
        for (PredefinedMetapath metapath : this.predefinedMetapathRepository.findPredefinedMetapathByDatasetAndShowit(dataset, true)) {

            Document metapathDoc = new Document();

            metapathDoc.append("metapath", metapath.getEntities());
            metapathDoc.append("metapathAbbreviation", metapath.getMetapath());
            metapathDoc.append("key", metapath.getKey());
            metapathDoc.append("description", metapath.getDescription());
            metapathDoc.append("timesUsed", metapath.getTimesUsed());

            predefinedMetapaths.add(metapathDoc);
        }

        return predefinedMetapaths;
    }

    public String getMetapathDescription(String dataset, List<String> entities) {


        List<PredefinedMetapath> result = this.predefinedMetapathRepository.findPredefinedMetapathByDatasetAndEntities(dataset, entities);
        if (result.size() > 0) {
            return result.get(0).getDescription();
        }
        return "";
    }
}

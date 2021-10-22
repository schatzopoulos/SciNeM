package athenarc.imsi.sdl.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import athenarc.imsi.sdl.domain.PredefinedMetapath;

@Repository
public interface PredefinedMetapathRepository extends MongoRepository<PredefinedMetapath, String> {

    List<PredefinedMetapath> findPredefinedMetapathByDatasetAndShowit(String dataset, Boolean showit);

    List<PredefinedMetapath> findPredefinedMetapathByDatasetAndEntities(String dataset, List<String> entities);

    PredefinedMetapath findFirstByDatasetAndMetapath(String dataset, String metapathAbbreviation);
}

package athenarc.imsi.sdl.domain;

import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "predefinedMetapath")
public class PredefinedMetapath {

    @Id
    private String id;

    private String dataset;
    private List<String> entities;
    private String metapath;
    private String key;
    private String description;
    private Integer timesUsed;
    private Boolean showit;

    public String getId() {
        return id;
    }

    public String getDataset() {
        return dataset;
    }

    public void setDataset(String dataset) {
        this.dataset = dataset;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<String> getEntities() {
        return entities;
    }

    public void setEntities(List<String> entities) {
        this.entities = entities;
    }

    public String getMetapath() {
        return metapath;
    }

    public void setMetapath(String metapath) {
        this.metapath = metapath;
    }

    public Integer getTimesUsed() {
        return timesUsed;
    }

    public void setTimesUsed(Integer timesUsed) {
        this.timesUsed = timesUsed;
    }

    public Boolean getShowit() {
        return showit;
    }

    public void setShowit(Boolean showit) {
        this.showit = showit;
    }
}

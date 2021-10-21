package athenarc.imsi.sdl.web.rest.vm;

import java.util.ArrayList;

import javax.validation.Valid;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

import org.bson.Document;

/**
 * View Model object for storing a user's credentials.
 */
public class QueryConfigVM {
    public static class Query {
        @NotEmpty
        @Size(min = 1, max = 50)
        public String metapath;

        @Size(min = 1, max = 50)
        public String joinpath;

        @NotEmpty
        public Document constraints;

        public String constraintsExpression;

        public String getMetapath() {
            return metapath;
        }

        public void setMetapath(String metapath) {
            this.metapath = metapath;
        }

        public String getJoinpath() {
            return joinpath;
        }

        public void setJoinpath(String joinpath) {
            this.joinpath = joinpath;
        }

        public Document getConstraints() {
            return constraints;
        }

        public void setConstraints(Document constraints) {
            this.constraints = constraints;
        }

        public String getConstraintsExpression() {
            return constraintsExpression;
        }

        public void setConstraintsExpression(String constraintsExpression) {
            this.constraintsExpression = constraintsExpression;
        }
        
    }

    @Valid
    private ArrayList<Query> queries;

    @NotNull
    private String dataset;

    @NotNull
    private String selectField;

    @NotNull
    private ArrayList<String> analysis;

    @NotNull
    private String primaryEntity;

    private int searchK;
    private int t;
    private int minValues;
    private int targetId;
    private int edgesThreshold;
    private double prAlpha;
    private double prTol;
    private int simMinValues;

    private String commAlgorithm;
    private double commThreshold;
    private int commStopCriterion; 
    private int commMaxSteps;
    private int commNumOfCommunities;
    private double commRatio;

    public int getSimMinValues() {
        return this.simMinValues;
    }

    public void setSimMinValues(int simMinValues) {
        this.simMinValues = simMinValues;
    }

    public String getPrimaryEntity() {
        return primaryEntity;
    }

    public void setPrimaryEntity(String primaryEntity) {
        this.primaryEntity = primaryEntity;
    }

    public double getPrAlpha() {
        return this.prAlpha;
    }

    public void setPrAlpha(double prAlpha) {
        this.prAlpha = prAlpha;
    }

    public double getPrTol() {
        return this.prTol;
    }

    public void setPrTol(double prTol) {
        this.prTol = prTol;
    }

    public int getEdgesThreshold() {
        return this.edgesThreshold;
    }

    public void setEdgesThreshold(int edgesThreshold) {
        this.edgesThreshold = edgesThreshold;
    }

    public int getSearchK() {
        return this.searchK;
    }

    public void setSearchK(int searchK) {
        this.searchK = searchK;
    }
    public int getT() {
        return this.t;
    }

    public void setT(int t) {
        this.t = t;
    }

    public int getMinValues() {
        return this.minValues;
    }

    public void setMinValues(int minValues) {
        this.minValues = minValues;
    }

    public String getDataset() {
        return this.dataset;
    }

    public void setDataset(String _dataset) {
        this.dataset = _dataset;
    }

    public String getSelectField() {
        return this.selectField;
    }

    public void setSelectField(String selectField) {
        this.selectField = selectField;
    }

    public int getTargetId() {
        return this.targetId;
    }

    public void setTargetId(int targetId) {
        this.targetId = targetId;
    }

    public ArrayList<String> getAnalysis() {
        return this.analysis;
    }

    public void setAnalysis(ArrayList<String> analysis) {
        this.analysis = analysis;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("RankingParamsVM {");
        for (Query query : this.queries) {
            sb.append("\tmetapath: " + query.metapath);
            sb.append("\tconstraint: " + query.constraints.toString());
            sb.append("\tdataset: " + this.dataset);
        }
        sb.append("}");
        return sb.toString();
    }

    public String getCommAlgorithm() {
        return commAlgorithm;
    }

    public void setCommAlgorithm(String commAlgorithm) {
        this.commAlgorithm = commAlgorithm;
    }

    public double getCommThreshold() {
        return commThreshold;
    }

    public void setCommThreshold(double commThreshold) {
        this.commThreshold = commThreshold;
    }

    public int getCommStopCriterion() {
        return commStopCriterion;
    }

    public void setCommStopCriterion(int commStopCriterion) {
        this.commStopCriterion = commStopCriterion;
    }

    public int getCommMaxSteps() {
        return commMaxSteps;
    }

    public void setCommMaxSteps(int commMaxSteps) {
        this.commMaxSteps = commMaxSteps;
    }

    public int getCommNumOfCommunities() {
        return commNumOfCommunities;
    }

    public void setCommNumOfCommunities(int commNumOfCommunities) {
        this.commNumOfCommunities = commNumOfCommunities;
    }

    public double getCommRatio() {
        return commRatio;
    }

    public void setCommRatio(double commRatio) {
        this.commRatio = commRatio;
    }

    public ArrayList<Query> getQueries() {
        return queries;
    }

    public void setQueries(ArrayList<Query> queries) {
        this.queries = queries;
    }

}

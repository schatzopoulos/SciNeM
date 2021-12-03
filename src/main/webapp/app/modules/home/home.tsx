import './home.scss';

import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import {
    Button,
    Card,
    Col,
    Container,
    CustomInput,
    Input,
    Progress,
    Row,
    Spinner,
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IRootState } from 'app/shared/reducers';
import CytoscapeComponent from 'react-cytoscapejs';
import _ from 'lodash';
import { analysisRun, getMoreResults, getResults, getStatus} from '../analysis/analysis.reducer';
import { getMetapathDescription, ACTION_TYPES as metapathActions} from 'app/modules/metapath/metapath.reducer';
import { getDatasetSchemas } from '../datasets/datasets.reducer'
import ResultsPanel from '../analysis/results/results';
import MetapathPanel from '../metapath/metapath-panel';
import AutocompleteInput from '../datasets/autocomplete-input';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import ConfigurationModal from './configurationModal';
import { metapathToString } from '../../shared/util/metapath-utils';
import { throws } from 'assert';

export interface IHomeProps extends StateProps, DispatchProps {
    loading: boolean;
    progress: number;
    progressMsg: string;
    error: string;
    docs: any;
    meta: any;
    uuid: string;
}

export class Home extends React.Component<IHomeProps> {
    readonly state: any = {
        queries: [],
        currentQueryIdx: 0,

        neighbors: undefined,

        analysis: ['Ranking'],
        dataset: '',
        selectField: '',

        typedTargetEntityValue: '',
        targetEntity: '',

        configurationActive: false,
        showTargetEntitySaveButton: false,

        edgesThreshold: 5,

        // ranking params
        prTol: 0.000001,
        prAlpha: 0.5,

        // sim search & join params
        simMinValues: 5,
        searchK: 100,
        hashTables: 1,

        // community detection params
        commAlgorithm: "LPA (GraphFrames)",
        commThreshold: 0, 
        commStopCriterion: 10, 
        commMaxSteps: 5,
        commNumOfCommunities: 20, 
        commRatio: 0.6,
    };
    _metapathPanelRef: any;
    cy: any;
    polling: any;

    getCurrentQuery() {
        return this.state.queries[this.state.currentQueryIdx] || [];
    }

    getCurrentMetapath() {
        return this.getCurrentQuery()['metapath'] || [];
    }

    getCurrentConstraints() {
        return this.getCurrentQuery()['constraints'] || {};
    }

    getPrimaryEntity() {
        return this.getCurrentMetapath()[0].data('label');
    }

    getMetapathEntityLabels() {
        return this.getCurrentMetapath().map(e => e.data('label'));
    }

    validMove(node) {
        // allow first move to be anywhere
        if (!this.state.neighbors) {
            return true;
        }

        return this.state.neighbors.contains(node);
    }

    animateNeighbors(node) {
        const nodes = this.cy.filter('node');

        // metapath was reset, so we can move to all nodes
        if (!node) {
            this.setState({
                neighbors: undefined
            }, () => {
                nodes.animate({
                    style: { 'background-color': 'grey', 'border-width': '0px' }
                });
            });
            return;
        }

        node.animate({
            style: { 'background-color': 'green' }
        });

        const neighbors = node.neighborhood();

        nodes.not(neighbors).animate({
            style: { 'border-width': '0px' }
        });

        nodes.not(node).animate({
            style: { 'border-width': '0px', 'background-color': 'grey' }
        });

        neighbors.animate({
            style: { 'border-color': 'red', 'border-width': '2px' }

        });

        this.setState({
            neighbors
        });
    }

    pollForResults() {
        this.polling = setInterval(() => {
            this.props.getStatus(this.props.uuid);
        }, 2000);
    }

    componentDidUpdate(prevProps) {

        // new uuid detected, start polling
        if (this.props.loading && !prevProps.loading) {
            this.pollForResults();
        } else if (prevProps.loading && !this.props.loading) {
            clearInterval(this.polling);
        }

        _.forOwn(this.props.status, (completed, analysis) => {
            if (completed && prevProps.status && !prevProps.status[analysis]
                && !this.props.progressMsg.startsWith('Warning')) {		// in that case the analysis was aborted
                this.props.getResults(analysis, this.props.uuid);
            }
        });

        if (!prevProps.schemas && this.props.schemas) {
            this.initCy();
        }
    }

    componentWillUnmount() {
        clearInterval(this.polling);
    }

    componentDidMount() {
        if (!this.props.schemas) {
            this.props.getDatasetSchemas();
        }

        if (this.cy) {
            this.initCy();
        }
    }

    tapNode(e) {
        const node = e.target;
        this.registerNode(node);
    }

    registerMultipleNodes(nodeList) {
        const metapath = [...this.getCurrentMetapath()];

        let temporaryNeighborhood = this.state.neighbors;

        nodeList.forEach(node => {
            if ((!temporaryNeighborhood) || (temporaryNeighborhood.contains(node))) {
                metapath.push(node);
                temporaryNeighborhood = node.neighborhood();
            } else {
                alert('Invalid selection of metapath nodes');
                return;
            }
        });

        // At this point all node additions are valid
        // temporaryMetapath contains the updated metapath structure
        // temporaryMetapathStr contains the updated metapath
        const constraints = { ...this.getCurrentConstraints() };
        nodeList.forEach(node => {
            _.forOwn(node.data('attributes'), (value) => {
                const entity = node.data('label');
                const field = value.name;

                // create constraints for node, if not already present
                if (!(entity in constraints) || !(field in constraints[entity])) {
                    this.checkAndCreateConstraints(constraints, {
                        entity,
                        field
                    }, value.type);
                }
            });
        });

        const lastNode = nodeList[nodeList.length - 1];

        const newState = { ...this.state };
        newState.queries[this.state.currentQueryIdx] = { metapath, constraints };

        if (this.state.selectField === '') {
            newState.selectField = lastNode.data('attributes').filter((attr) => attr.name !== 'id')[0].name;
        }

        this.setState(newState, () => {
            if (metapath.length > 2) {
                this.props.getMetapathDescription(
                    this.getCurrentDataset(),
                    this.getMetapathEntityLabels()
                );
            }
            this.animateNeighbors(lastNode);
        });
    }

    // TODO: seems to have duplicate code registerMultipleNodes
    registerNode(node, checkValid=true) {

        if (!this.validMove(node) && checkValid) {
            alert('This selection is not allowed, please select on of the nodes denoted with green color');
            return;
        }

        // update metapath
        const metapath = [ ...this.getCurrentMetapath() ];
        metapath.push(node);

        // set constraints
        const constraints = { ...this.getCurrentConstraints() };

        _.forOwn(node.data('attributes'), (value) => {
            const entity = node.data('label');
            const field = value.name;

            // create constraints for node, if not already present
            if (!(entity in constraints) || !(field in constraints[entity])) {
                this.checkAndCreateConstraints(constraints, {
                    entity,
                    field
                }, value.type);
            }
        });

        const newState = { ...this.state };
        newState.queries[this.state.currentQueryIdx] = { metapath, constraints };

        // select first attribute from the options
        if (this.state.selectField === '') {
            newState.selectField = node.data('attributes').filter((attr) => attr.name !== 'id')[0].name;
        }

        this.setState(newState, () => {
            if (metapath.length > 2) {
                this.props.getMetapathDescription(
                    this.getCurrentDataset(),
                    this.getMetapathEntityLabels()
                );
            }
            this.animateNeighbors(node);
        });
    }

    addMultiple(idList) {
        const nodeList = idList.map(id => {
            const results = this.cy.filter(`[id="${id}"]`);
            return results[0];
        });
        this.registerMultipleNodes(nodeList);
    }

    simulateClickOnNode(id) {
        const results = this.cy.filter(`[id="${id}"]`);
        if (results.length > 0) {
            const node = results[0];
            this.registerNode(node);
        }
    }

    initCy() {
        // center align graph
        this.cy.center();

        // init all nodes with grey color
        const nodes = this.cy.filter('node');
        nodes.animate({
            style: { 'background-color': 'grey', 'border-width': '0px' }
        });

        // change state and animate on node click
        this.cy.on('tap', 'node', (e) => this.tapNode(e));
    }

    /**
     * Delete last character of the metapath
     */
    deleteLast() {

        const metapath = [ ...this.getCurrentMetapath() ];
        metapath.pop();
        const lastNode = metapath[metapath.length - 1];

        const metapathStr = metapathToString(metapath);

        // keep constraints for nodes that are in the metapath
        const constraints = {};
        _.forOwn(this.getCurrentConstraints(), (entityConstraint, entity) => {
            const e = entity.substr(0, 1);
            if (metapathStr.includes(e)) {
                constraints[entity] = entityConstraint;
            }
        });

        const newState = { ...this.state };
        newState.queries[this.state.currentQueryIdx] = { metapath, constraints };

        // clear select field when metapath is deleted
        if (metapath.length === 0) {
            newState.selectField = '';
            newState.targetEntity = '';
            newState.typedTargetEntityValue = '';
            newState.showTargetEntitySaveButton = false;
        }

        this.setState(newState, () => {
            this.animateNeighbors(lastNode);
        });
    }

    checkAndCreateConstraints(constraints, { entity, field }, type = null, logicOp = undefined, conditionOp = '=', val = null) {
        if (!(entity in constraints)) {
            constraints[entity] = {};
        }

        // create object for attribute, if not present
        if (!(field in constraints[entity])) {
            constraints[entity][field] = {
                nextIndex: 0,
                enabled: true,
                type,
                conditions: []
            };
        }

        const index = constraints[entity][field]['nextIndex'];
        constraints[entity][field]['nextIndex'] += 1;

        const found = constraints[entity][field]['conditions'].includes(c => c.index === index);
        if (!found) {
            constraints[entity][field]['conditions'].push({
                index,
                value: val,
                operation: conditionOp,
                logicOp: logicOp ? logicOp : (index > 1) ? 'or' : undefined
            });
        }
    }

    handleConstraintOpDropdown({ entity, field, index }, value) {
        const constraints = { ...this.getCurrentConstraints() };
        const found = constraints[entity][field]['conditions'].find(c => c.index === index);
        if (found) {
            found['operation'] = value;
        }

        this.setState({
            constraints
        });
    }

    getSelectFieldOptions() {
        if (this.getCurrentMetapath().length === 0) {
            return { selectedEntity: '', selectFieldOptions: [] };
        }

        const selectFieldOptions = [];
        const firstNode = this.getCurrentMetapath()[0];

        const selectedEntity = firstNode.data('label');
        _.forOwn(firstNode.data('attributes'), (value, key) => {
            if (value.name !== 'id') {
                selectFieldOptions.push(
                    <option key={key} value={value.name}>{value.name} (:{value.type})</option>
                );
            }
        });

        return { selectedEntity, selectFieldOptions };
    }

    handleConstraintLogicOpDropdown({ entity, field, index }, value) {
        const constraints = { ...this.getCurrentConstraints() };
        const found = constraints[entity][field]['conditions'].find(c => c.index === index);
        if (found) {
            found['logicOp'] = value;
        }

        this.setState({
            constraints
        });
    }

    handleConstraintInputChange({ entity, field, index }, value) {

        const constraints = { ...this.getCurrentConstraints() };

        const found = constraints[entity][field]['conditions'].find(c => c.index === index);
        if (found) {
            found['value'] = value;
        }

        this.setState({
            constraints
        });
    }

    handleMultipleConditionsAddition({ entity, field }, conditionsList) {
        const constraints = { ...this.getCurrentConstraints() };

        conditionsList.forEach(condition => {
            this.checkAndCreateConstraints(constraints, {
                entity,
                field
            }, null, condition.logicOp, condition.operation, condition.value);
        });
        this.setState({
            constraints
        });
    }

    handleConstraintAddition({ entity, field }, logicOp, conditionOp, value) {
        const constraints = { ...this.getCurrentConstraints() };

        this.checkAndCreateConstraints(constraints, { entity, field }, null, logicOp, conditionOp, value);
        this.setState({ constraints });
    }

    handleConstraintRemoval({ entity, field, index }) {
        const constraints = { ...this.getCurrentConstraints() };

        const newConditions = [];
        let deleted = false;
        constraints[entity][field]['conditions'].forEach(constraintObject => {
            if (constraintObject.index !== index) {
                if (deleted) {
                    constraintObject.index--;
                }
                newConditions.push(constraintObject);
            } else {
                deleted = true;
            }
        });
        constraints[entity][field]['conditions'] = newConditions;
        constraints[entity][field]['nextIndex'] = constraints[entity][field]['conditions'].length;
        this.setState({ constraints });
    }



    clearCurrentMetapath() {
        const newState = { ... this.state };

        // if we already have a submitted query, then clear query until first entity
        if (this.state.queries.length > 1) {

            const firstEntity = this.getCurrentMetapath()[0];

            newState.queries[this.state.currentQueryIdx] = {
                metapath: [],
                constraints: {}
            };

            this.setState(newState, () => {

                // set first entity to be the same for all metapaths
                this.registerNode(firstEntity, false);
            });

        // we have only one query metapath
        } else {
            this.setState({
                queries: [], 
                currentQueryIdx: 0,
            }, () => {
                this.animateNeighbors(undefined);
            });
        }
    }

    addNewMetapath() {
        const newState = { ... this.state };
        
        // add an empty metapath
        newState.queries.push({
            metapath: [],
            constraints: {}
        });

        // increment query index
        newState.currentQueryIdx = this.state.currentQueryIdx + 1;

        const firstEntity = this.getCurrentMetapath()[0];

        this.setState(newState, () => {

            // set first entity to be the same for all metapaths
            this.registerNode(firstEntity, false);
        });
    }

    changeCurrentMetapath(currentQueryIdx) {
        this.setState({ currentQueryIdx }, () => {
            const metapath = this.getCurrentMetapath();
            const lastEntity = metapath[metapath.length - 1];
            this.animateNeighbors(lastEntity);
        });
    }

    deleteSelectedMetapath(idx, e) {
        e.stopPropagation();

        const queries = this.state.queries.filter( (q, i) => i !== idx);
        let currentQueryIdx = this.state.currentQueryIdx;
        if (currentQueryIdx && queries.length - 1 < currentQueryIdx) {
            currentQueryIdx -= 1;
        }

        this.setState({ 
            queries, currentQueryIdx
        }, () => {
            const metapath = this.getCurrentMetapath();
            const lastEntity = metapath[metapath.length - 1];
            this.animateNeighbors(lastEntity);
        });
    }

    execute(e, rerunAnalysis) {

        const analysisType = (rerunAnalysis) ? rerunAnalysis : this.state.analysis;

        this.props.analysisRun(
            analysisType,
            this.state.queries,
            this.getPrimaryEntity(),
            this.getCurrentDataset(),
            this.state.selectField,
            this.state.targetEntity,
            this.state.edgesThreshold,
            this.state.prTol,
            this.state.prAlpha,
            this.state.simMinValues,
            this.state.searchK,
            this.state.hashTables,
            this.state.commAlgorithm,
            this.state.commThreshold, 
            this.state.commStopCriterion, 
            this.state.commMaxSteps,
            this.state.commNumOfCommunities, 
            this.state.commRatio,
            // (rerunAnalysis) ? 15 : undefined,
            // (rerunAnalysis) ? 1 : undefined
        );
    }

    loadMoreResults(analysis, nextPage) {
        this.props.getMoreResults(analysis, this.props.uuid, nextPage);
    }

    getHierarchicalResults(analysis, communityId) {
        this.props.getResults(analysis, this.props.uuid, 1, communityId);
    }

    handleAnalysisDropdown(e) {
        this.setState({
            analysis: e.target.value,
            targetEntity: ''
        });
    }

    onCheckboxBtnClick(selected) {
        const newState = { ...this.state };

        const index = newState.analysis.indexOf(selected);
        if (index < 0) {
            newState.analysis.push(selected);
        } else {
            newState.analysis.splice(index, 1);
            if (selected === 'Similarity Search') {
                newState.typedTargetEntityValue = '';
                newState.showTargetEntitySaveButton = false;
                newState.targetEntity = '';
            }
        }
        this.setState(newState);
    }

    handleConstraintSwitch({ entity, field }) {
        // create object for entity, if not present
        const constraints = { ...this.getCurrentConstraints() };

        constraints[entity][field]['enabled'] = !constraints[entity][field]['enabled'];

        this.setState({ constraints });
    }

    toggleConfiguration() {
        this.setState({
            configurationActive: !this.state.configurationActive
        });
    }

    getSchema() {
        const style = {
            width: '100%',
            height: '200px'
        };

        const layout = {
            name: 'cose',
            animate: false
        };

        let elements;
        let datasetToUse = null;

        if (this.props.schemas) {
            datasetToUse = this.getCurrentDataset();
            elements = this.props.schemas[datasetToUse]['elements'];
        } else {
            elements = null;
        }

        let schema;
        if (elements) {
            schema = <CytoscapeComponent cy={(cy) => { this.cy = cy; }} elements={elements} style={style} layout={layout} zoomingEnabled={false} />;
        } else {
            schema = <Spinner style={{ width: '200px', height: '200px', marginLeft: 'auto', marginRight: 'auto' }} type="grow" color="info" />;
        }

        return schema;
    }

    changeSchema() {

        const elements = this.props.schemas[this.getCurrentDataset()]['elements'];

        this.cy.elements().remove();
        this.cy.add(elements);
        
        const newLayout = this.cy.layout({
            name: 'cose',
            animate: false
        });

        newLayout.run();
        this.cy.center();
    }

    resetSchemaColors() {
        const nodes = this.cy.filter('node');

        nodes.animate({
            style: { 'border-width': '0px', 'background-color': 'grey' }
        });
    }

    handleDatasetDropdown(e) {
        e.preventDefault();

        const newState = { ...this.state };
        newState.queries = [];
        newState.currentQueryIdx = 0;
        newState.neighbors = undefined;
        newState.selectField = '';
        newState.targetEntity = '';
        newState.typedTargetEntityValue = '';
        newState.showTargetEntitySaveButton = false;
        newState.dataset = e.target.value;

        this.setState(newState, () => {
            this.changeSchema();
            this.resetSchemaColors();
        });
    }

    getDatasetOptions() {
        let options = [];
        if (this.props.schemas) {
            options = _.map(this.props.schemas, (value, key) => {
                return <option key={key} value={key}>{key}</option>;
            });
        }
        return options;
    }

    handleSelectFieldChange(e) {
        e.preventDefault();

        const newState = { ...this.state };
        newState.selectField = e.target.value;
        this.setState(newState);
    }

    handleTargetEntity(e) {
        let targetEntity;

        if (_.isEmpty(e)) {
            targetEntity = '';
        } else {
            targetEntity = e.id;
        }

        this.setState({ targetEntity });
    }

    handleAdvancedOptions(e) {
        const newState = { ...this.state };
        newState[e.target.id] = e.target.value;
        this.setState(newState);
    }

    setInterpretation(dataset, metapath, description) {
        this.setState({
            description: [dataset, metapath, description]
        })
    }

    clearAllMetapaths() {
        const newState = {
            queries: [{
                metapath: [],
                constraints: {}
            }],
            selectField: '',
            typedTargetEntityValue: '',
            targetEntity: '',
            showTargetEntitySaveButton: false
        };
        this.setState(newState, () => {
            this.animateNeighbors(undefined);
        });
    }

    setTargetEntity() {
        if (this.state.showTargetEntitySaveButton) {
            this.setState({
                showTargetEntitySaveButton: false,
                targetEntity: this.state.typedTargetEntityValue
            });
        }
    }

    setMetapath(metapathEntities) {
        const cytoscapeNodes = metapathEntities.map(entity => this.cy.filter(`[label="${entity}"]`)[0]);
        this.registerMultipleNodes(cytoscapeNodes);
    }

    getCurrentDataset() {
        return (this.state.dataset === '') ? Object.keys(this.props.schemas)[0] : this.state.dataset;
    }

    validateQueries() {
        if (_.isEmpty(this.state.queries) || !this._metapathPanelRef)
            return false;

        let valid = true;

        this.state.queries.forEach( ({ metapath, constraints }) => {
            valid = valid && this._metapathPanelRef.isMetapathValid(metapath, constraints);
        });
        return valid;
    }
    render() {
        const datasetOptions = this.getDatasetOptions();
        const schema = this.getSchema();
        const validQueries = this.validateQueries();
        const validAnalysisType = this.state.analysis.length !== 0;
        const validTargetEntity = (!this.state.analysis.includes('Similarity Search') || (this.state.analysis.includes('Similarity Search') && this.state.targetEntity !== ''));
        const { selectedEntity, selectFieldOptions }: any = this.getSelectFieldOptions();

        let datasetToUse;
        if (this.props.schemas) {
            datasetToUse = this.getCurrentDataset();
        }

        const rankingLabel = <span>
			Ranking <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle"
                                     title="Ranking analysis is perfomed using PageRank." />
		</span>;
        const communityLabel = <span>
			Community Detection <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle" title="Community Detection analysis is perfomed using Louvain Modularity method." />
		</span>;
        const simJoinLabel = <span>
			Similarity Join <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle" title="Similarity Join is perfomed using JoinSim." />
		</span>;
        const simSearchLabel = <span>
			Similarity Search <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle" title="Similarity Search is perfomed using JoinSim similarity measure." />
		</span>;

        return (
            <Container>
                <Row className={'justify-content-center'}>
                    <Col md="12">
                        <Row>
                            <Col md="12">
                                <Row>
                                    <Col md='8'>
                                        <h4>Working dataset</h4>
                                    </Col>
                                    <Col md='4'>
                                        <Button outline color="info" tag={Link} to="/upload" className="float-right"
                                                size='sm'>
                                            <FontAwesomeIcon icon="upload" /> Upload
                                        </Button>
                                    </Col>
                                </Row>
                                <Input value={this.state.dataset} type="select" name="dataset" id="dataset"
                                       onChange={this.handleDatasetDropdown.bind(this)}>
                                    {datasetOptions}
                                </Input>
                            </Col>
                        </Row>
                        <br />

                        <span className={'text-secondary my-0'}>Dataset schema</span>
                        <Card className="mx-auto">
                            {schema}
                        </Card>
                    </Col>
                </Row>  
                
                <Row className={'mt-4 mb-4'}>
                    <Col md='6'>
                        <h4>Select analysis type</h4>
                    </Col>
                    <Col md='6'>
                        <Button outline size='sm' color="info" title="Advanced Options"
                                className="float-right" active={this.state.configurationActive}
                                onClick={this.toggleConfiguration.bind(this)}>
                            <FontAwesomeIcon icon="cogs" /> Configuration
                        </Button>
                        <ConfigurationModal 
                            isOpen={this.state.configurationActive}
                            
                            edgesThreshold={this.state.edgesThreshold}
                            
                            prAlpha={this.state.prAlpha}
                            prTol={this.state.prTol}
                            
                            searchK={this.state.searchK}
                            hashTables={this.state.hashTables}
                            simMinValues={this.state.simMinValues}
                            
                            commAlgorithm={this.state.commAlgorithm}
                            commMaxSteps={this.state.commMaxSteps}
                            commStopCriterion={this.state.commStopCriterion}
                            commThreshold={this.state.commThreshold}
                            commNumOfCommunities={this.state.commNumOfCommunities}
                            commRatio={this.state.commRatio}

                            toggleConfiguration={this.toggleConfiguration.bind(this)}
                            handleAdvancedOptions={this.handleAdvancedOptions.bind(this)}
                        />
                    </Col>

                    <Col md='6'>
                        <Row>
                            <Col>
                                <CustomInput type="switch" id="rankingSwith"
                                                onChange={() => this.onCheckboxBtnClick('Ranking')}
                                                checked={this.state.analysis.includes('Ranking')}
                                                label={rankingLabel} />
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <CustomInput type="switch" id="simJoinSwitch"
                                                onChange={() => this.onCheckboxBtnClick('Similarity Join')}
                                                checked={this.state.analysis.includes('Similarity Join')}
                                                label={simJoinLabel} />
                            </Col>
                        </Row>
                    </Col>
                    <Col md={'6'}>
                        <Row>
                            <Col>
                                <CustomInput type="switch" id="cdSwitch"
                                                onChange={() => this.onCheckboxBtnClick('Community Detection')}
                                                checked={this.state.analysis.includes('Community Detection')}
                                                label={communityLabel} />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={'12'}>
                                <CustomInput type="switch" id="simSearchSwitch"
                                                onChange={() => this.onCheckboxBtnClick('Similarity Search')}
                                                checked={this.state.analysis.includes('Similarity Search')}
                                                label={simSearchLabel} />
                            </Col>
                        </Row>
                        {
                            (this.state.analysis.includes('Similarity Search')) &&
                            <Col xs={'12'}>
                                <Row>
                                    <Col xs={'10'} className={'px-0'}>
                                        
                                        <AutocompleteInput
                                            id="targetEntityInput"
                                            placeholder={_.isEmpty(this.getCurrentMetapath()) ? 'First, select a metapath' : `Search for ${selectedEntity} entities`}
                                            key={`similarity-search-field${this.getCurrentMetapath().length > 0 ? '-for-' + this.getPrimaryEntity() : ''}`}
                                            onChange={(val, callback = () => {
                                            }) => {
                                                const selectedId = val.id;
                                                if (this.state.targetEntity && this.state.targetEntity !== selectedId) {
                                                    this.setState({
                                                        typedTargetEntityValue: selectedId,
                                                        targetEntity: ''
                                                    }, callback);
                                                } else {
                                                    this.setState({
                                                        typedTargetEntityValue: selectedId
                                                    }, callback);
                                                }
                                            }}
                                            hasValidValue={validTypedValue => {
                                                this.setState({
                                                    showTargetEntitySaveButton: !!validTypedValue && (validTypedValue.id !== this.state.targetEntity)
                                                });
                                            }}
                                            entity={selectedEntity}
                                            field={this.state.selectField}
                                            dataset={datasetToUse}
                                            disabled={_.isEmpty(this.getCurrentMetapath())}
                                            size='sm'
                                            index={0}
                                            additionTriggerCallback={this.setTargetEntity.bind(this)}
                                            uniqueValues={false}
                                        />
                                    </Col>
                                    {this.state.showTargetEntitySaveButton &&
                                    <Col xs={'2'} className={'pl-1'}>
                                        <Button color={'info'} size={'sm'}
                                                onClick={this.setTargetEntity.bind(this)}><FontAwesomeIcon
                                            icon={'save'} /></Button>
                                    </Col>
                                    }
                                </Row>
                                {
                                    (this.state.targetEntity === '') &&
                                    <Row>
                                        <Col xs={'12'} className={'px-0'}>
                                        <span className="attribute-type text-danger">
                                            {this.getCurrentMetapath().length > 0
                                                ? this.state.typedTargetEntityValue
                                                    ? this.state.showTargetEntitySaveButton
                                                        ? 'The new value of the field must be saved.'
                                                        : 'The value of the field must be a valid option from the ones provided.'
                                                    : 'This field cannot be empty when Similarity Search is enabled.'
                                                : 'Select an entity first'}
                                        </span>
                                        </Col>
                                    </Row>
                                }
                            </Col>
                        }
                        
                        {
                            (!validAnalysisType) &&
                            <Col md={'6'} className="attribute-type text-danger">
                                Please select at least one type of analysis.
                            </Col>
                        }

                    </Col>
                </Row>
                <hr/>
                <Row className={'mt-4'}>
                    <Col xs={12}>
                        <Row>
                            <Col xs={6}>
                                <h4>Query metapath(s)</h4>
                            </Col>
                            <Col xs={6} className={'text-right'}>
                                {
                                    !_.isEmpty(this.getCurrentMetapath()) &&
                                    <span>
                                        <Button color={'danger'} onClick={this.clearAllMetapaths.bind(this)} size={'sm'} title="Delete all metapaths">
                                            <FontAwesomeIcon icon={faTimes} /> Clear all
                                        </Button>
                                    </span>
                                }
                            </Col>
                        </Row>
                        {(this.props.schemas) &&
                        <MetapathPanel
                            ref={ (ref) =>  this._metapathPanelRef = ref }
                            metapath={this.getCurrentMetapath()}
                            queries={this.state.queries}
                            currentQueryIdx={this.state.currentQueryIdx}
                            schema={this.props.schemas[datasetToUse]}
                            dataset={datasetToUse}
                            analysis={this.state.analysis}
                            constraints={this.getCurrentConstraints()}
                            metapathLoading={this.props.metapathLoading}
                            metapathInfo={this.props.metapathInfo}
                            selectField={this.state.selectField}
                            selectFieldOptions={selectFieldOptions}
                            onNewEntity={this.simulateClickOnNode.bind(this)}
                            onRecommendationAccept={this.addMultiple.bind(this)}
                            onDelete={this.deleteLast.bind(this)}
                            handleSwitch={this.handleConstraintSwitch.bind(this)}
                            handleDropdown={this.handleConstraintOpDropdown.bind(this)}
                            handleLogicDropdown={this.handleConstraintLogicOpDropdown.bind(this)}
                            handleInput={this.handleConstraintInputChange.bind(this)}
                            handleAddition={this.handleConstraintAddition.bind(this)}
                            handleNewMetapath={this.addNewMetapath.bind(this)}
                            handleRemoval={this.handleConstraintRemoval.bind(this)}
                            handleClear={this.clearCurrentMetapath.bind(this)}
                            handleSelectFieldChange={this.handleSelectFieldChange.bind(this)}
                            handleMultipleAddition={this.handleMultipleConditionsAddition.bind(this)}
                            handlePredefinedMetapathAddition={this.setMetapath.bind(this)}
                            handleMetapathSelection={this.changeCurrentMetapath.bind(this)}
                            handleMetapathDeletetion={this.deleteSelectedMetapath.bind(this)}
                        />                                   
                        }
                    </Col>
                </Row>
                <Row className={'mt-4'}>
                    <Col md={{ size: 4, offset: 4 }}>
                        <Button block color="success"
                                disabled={this.props.loading || !validQueries || !validTargetEntity}
                                onClick={this.execute.bind(this)}>
                            <FontAwesomeIcon icon="play" /> Execute analysis
                        </Button>
                    </Col>
                </Row>
                <Row>
                    <Col md='12'>
                        {this.props.uuid &&
                            <Card className={'my-4 pt-0'}>
                                <Row className={'justify-content-end'}>
                                    <h6 className={'p-2'}><strong className={'text-muted'}>Analysis
                                        id: <Link to={`/jobs/${this.props.uuid}`}
                                                  target="_blank">{this.props.uuid}</Link></strong></h6>
                                </Row>
                                {this.props.error &&
                                <Row>
                                    <Col xs={'12'} className={'text-danger'}>{this.props.error}</Col>
                                </Row>
                                }
                                {
                                    ((this.props.description || '').startsWith('Warning')) &&
                                    <Row className="small-red text-center">
                                        <Col>
                                            {this.props.description}
                                        </Col>
                                    </Row>
                                }
                                {
                                    (this.props.loading) &&
                                    <Row className="small-grey text-center">
                                        <Col>
                                            {!_.isEmpty(this.props.description)
                                                ? this.props.description
                                                : <span>
                                                    <Spinner size='sm' className="small-grey"/> Loading analysis description...
                                                </span>
                                            }
                                            {/* {this.props.progress && this.props.progress < 100 ?
                                                <Button size={'sm'} className={'badge btn-danger'}><FontAwesomeIcon
                                                    icon={faTimes} /> Cancel analysis</Button> : ''} */}
                                        </Col>
                                    </Row>
                                }
                                {
                                    (this.props.loading) && 
                                        <Progress animated color="info" value={this.props.progress}>{this.props.progressMsg}</Progress>
                                }

                                <ResultsPanel
                                    uuid={this.props.uuid}
                                    description={this.props.description}
                                    results={this.props.results}
                                    analysis={this.props.analysis}
                                    analysisId={this.props.uuid}
                                    loadMore={this.loadMoreResults.bind(this)}
                                    getHierarchicalResults={this.getHierarchicalResults.bind(this)}
                                    rerun={this.execute.bind(this)}
                                />
                            </Card>
                            }
                    </Col>
                </Row>
            </Container>
        );
    }
}

const mapStateToProps = (storeState: IRootState) => ({
    loading: storeState.analysis.loading,
    status: storeState.analysis.status,
    progress: storeState.analysis.progress,
    progressMsg: storeState.analysis.progressMsg,
    description: storeState.analysis.description,
    error: storeState.analysis.error,
    results: storeState.analysis.results,
    uuid: storeState.analysis.uuid,
    analysis: storeState.analysis.analysis,
    schemas: storeState.datasets.schemas,
    metapathInfo: storeState.metapath.metapathInfo,
    metapathLoading: storeState.metapath.loading,
});

const mapDispatchToProps = {
    analysisRun,
    getStatus,
    getResults,
    getMoreResults,
    getDatasetSchemas,
    getMetapathDescription
};

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = typeof mapDispatchToProps;

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Home);




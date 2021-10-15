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
import { generateGroupsOfDisjunctions } from 'app/shared/util/constraint-utils';
import CytoscapeComponent from 'react-cytoscapejs';
import _ from 'lodash';
import { analysisRun, getMoreResults, getResults, getStatus} from '../analysis/analysis.reducer';
import { getMetapathDescription, ACTION_TYPES as metapathActions} from 'app/modules/metapath/metapath.reducer';
import { getDatasetSchemas } from '../datasets/datasets.reducer'
import ResultsPanel from '../analysis/results/results';
import MetapathPanel from '../metapath/metapath-panel';
import AutocompleteInput from '../datasets/autocomplete-input';
import { faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import ConfigurationModal from './configurationModal';

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
        metapath: [],
        metapathStr: '',
        metapathTab: 'metapath-constructor',
        neighbors: undefined,
        constraints: {},
        analysis: ['Ranking'],
        dataset: '',
        selectField: '',

        typedTargetEntityValue: '',
        showTargetEntitySaveButton: false,
        targetEntity: '',

        configurationActive: false,

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

    pollMetapathDescription = null;

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
        const temporaryMetapath = [...this.state.metapath];
        const getMetapathStr = metapath => metapath.map(n => {
            return n.data('label').substr(0, 1);
        }).join('');
        let temporaryNeighborhood = this.state.neighbors;
        let temporaryMetapathStr = getMetapathStr(temporaryMetapath);
        nodeList.forEach(node => {
            if ((!temporaryNeighborhood) || (temporaryNeighborhood.contains(node))) {
                temporaryMetapath.push(node);
                temporaryMetapathStr = getMetapathStr(temporaryMetapath);

                temporaryNeighborhood = node.neighborhood();
            } else {
                alert('Invalid selection of metapath nodes');
                return;
            }
        });

        // At this point all node additions are valid
        // temporaryMetapath contains the updated metapath structure
        // temporaryMetapathStr contains the updated metapath
        const constraints = { ...this.state.constraints };
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
        newState.metapath = temporaryMetapath;
        newState.metapathStr = temporaryMetapathStr;
        newState.constraints = constraints;

        if (this.state.selectField === '') {
            newState.selectField = lastNode.data('attributes').filter((attr) => attr.name !== 'id')[0].name;
        }

        this.setState(newState, () => {
            if (this.state.metapath.length>2) {
                this.props.getMetapathDescription(
                    this.getCurrentDataset(),
                    this.state.metapath.map(metapathCytoscapeNode=>metapathCytoscapeNode.data('label'))
                );
            }
            this.animateNeighbors(lastNode);
        });
    }

    registerNode(node) {

        if (!this.validMove(node)) {
            alert('This selection is not allowed, please select on of the nodes denoted with green color');
            return;
        }

        // set metapath
        const metapath = [...this.state.metapath];	// copy array
        metapath.push(node);
        const metapathStr = metapath.map(n => n.data('label').substr(0, 1)).join('');

        // set constraints
        const constraints = { ...this.state.constraints };
        // const attrs = node.data('attributes').filter(n => (n.name !== 'id'));
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
        newState.metapath = metapath;
        newState.metapathStr = metapathStr;
        newState.constraints = constraints;

        // select first attribute from the options
        if (this.state.selectField === '') {
            newState.selectField = node.data('attributes').filter((attr) => attr.name !== 'id')[0].name;
        }

        this.setState(newState, () => {
            if (this.state.metapath.length>2) {
                this.props.getMetapathDescription(
                    this.getCurrentDataset(), 
                    this.state.metapath.map(metapathCytoscapeNode => metapathCytoscapeNode.data('label')));
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

        const metapath = [...this.state.metapath];	// copy array
        metapath.pop();
        const metapathStr = metapath.map(n => n.data('label').substr(0, 1)).join('');

        const node = metapath[metapath.length - 1];

        // keep constraints for nodes that are in the metapath
        const constraints = {};
        _.forOwn(this.state.constraints, (entityConstraint, entity) => {
            const e = entity.substr(0, 1);
            if (metapathStr.includes(e)) {
                constraints[entity] = entityConstraint;
            }
        });

        const newState = { ...this.state };
        newState.metapath = metapath;
        newState.metapathStr = metapathStr;
        newState.constraints = constraints;

        // clear select field when metapath is deleted
        if (metapath.length === 0) {
            newState.selectField = '';
            newState.targetEntity = '';
            newState.typedTargetEntityValue = '';
            newState.showTargetEntitySaveButton = false;
        }

        this.setState(newState, () => {
            this.animateNeighbors(node);
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
        const constraints = { ...this.state.constraints };
        const found = constraints[entity][field]['conditions'].find(c => c.index === index);
        if (found) {
            found['operation'] = value;
        }

        this.setState({
            constraints
        });
    }

    getSelectFieldOptions() {
        if (this.state.metapath.length === 0) {
            return { selectedEntity: '', selectFieldOptions: [] };
        }

        const selectFieldOptions = [];
        const firstNode = this.state.metapath[0];

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
        const constraints = { ...this.state.constraints };
        const found = constraints[entity][field]['conditions'].find(c => c.index === index);
        if (found) {
            found['logicOp'] = value;
        }

        this.setState({
            constraints
        });
    }

    handleConstraintInputChange({ entity, field, index }, value) {

        const constraints = { ...this.state.constraints };

        const found = constraints[entity][field]['conditions'].find(c => c.index === index);
        if (found) {
            found['value'] = value;
        }

        this.setState({
            constraints
        });
    }

    handleMultipleConditionsAddition({ entity, field }, conditionsList) {
        const constraints = { ...this.state.constraints };

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
        const constraints = { ...this.state.constraints };

        this.checkAndCreateConstraints(constraints, { entity, field }, null, logicOp, conditionOp, value);
        this.setState({
            constraints
        }, () => {
            // console.warn(this.state.constraints);
        });
    }

    handleConstraintRemoval({ entity, field, index }) {
        const constraints = { ...this.state.constraints };

        // constraints[entity][field]['conditions'] = constraints[entity][field]['conditions'].filter(n => n.index !== index);
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
        this.setState({
            constraints
        });
    }

    execute(e, rerunAnalysis) {

        const analysisType = (rerunAnalysis) ? rerunAnalysis : this.state.analysis;

        const constaintDescriptions = {};
        Object.keys(this.state.constraints).forEach((entity, index) => {
            constaintDescriptions[entity] = generateGroupsOfDisjunctions(this.state.constraints[entity], `${entity}.`);
        });
        const constraintsExpression = this.constraintsSummary(constaintDescriptions);

        const primaryEntity = this.state.metapath[0].data('label');

        this.props.analysisRun(
            analysisType,
            this.state.metapathStr,
            this.getJoinPath(),
            this.state.constraints,
            constraintsExpression,
            primaryEntity,
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
            (rerunAnalysis) ? 15 : undefined,
            (rerunAnalysis) ? 1 : undefined
        );
    }

    runExample(e) {

        const newState = { ...this.state };

        const nodes = this.cy.filter('node');

        switch (this.state.analysis) {
            case 'ranking': {
                const node = nodes.select('label=MiRNA');

                newState.dataset = 'Bio';
                newState.metapathStr = 'MGDGM';
                newState.selectField = 'name';
                newState.constraints = {
                    'Disease': {
                        'name': {
                            'nextIndex': 1,
                            'enabled': true,
                            'type': 'string',
                            'conditions': [{ 'index': 0, 'value': 'Adenocarcinoma', 'operation': '=' }]
                        }
                    }
                };
                break;
            }
            case 'simjoin':
                newState.dataset = 'DBLP';
                newState.metapathStr = 'VPTPV';
                newState.selectField = 'name';
                break;
            case 'simsearch':
                newState.dataset = 'DBLP';
                newState.metapathStr = 'VPAPV';
                newState.selectField = 'name';
                newState.targetEntity = 360;
                break;
            default:
                alert('This type of analysis will be implemented soon');
        }

        this.setState(newState, () => {
            this.changeSchema();
            this.execute(e, null);
        });
    }

    loadMoreResults(analysis, nextPage) {
        this.props.getMoreResults(analysis, this.props.uuid, nextPage);
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
        const constraints = { ...this.state.constraints };

        constraints[entity][field]['enabled'] = !constraints[entity][field]['enabled'];

        this.setState({
            constraints
        });
    }

    toggleConfiguration() {
        this.setState({
            configurationActive: !this.state.configurationActive
        });
    }

    getJoinPath() {
        const metapath = this.state.metapathStr.slice(0);
        const midPos = Math.floor(metapath.length / 2) + 1;
        return metapath.substr(0, midPos);
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
        // let dataset = {};
        if (this.props.schemas) {
            datasetToUse = this.getCurrentDataset();
            elements = this.props.schemas[datasetToUse]['elements'];
        } else {
            elements = null;
        }

        let schema;
        if (elements) {
            schema = <CytoscapeComponent cy={(cy) => {
                this.cy = cy;
            }} elements={elements} style={style} layout={layout} zoomingEnabled={false} />;
        } else {
            schema = <Spinner style={{ width: '200px', height: '200px', marginLeft: 'auto', marginRight: 'auto' }}
                              type="grow" color="info" />;
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
        newState.metapath = [];
        newState.metapathStr = '';
        newState.neighbors = undefined;
        newState.constraints = {};
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
        let selected;

        if (_.isEmpty(e)) {
            selected = '';
        } else {
            // [selected] = e;
            selected = e.id;
        }

        this.setState({
            targetEntity: selected
        });
    }

    handleAdvancedOptions(e) {
        const newState = { ...this.state };
        newState[e.target.id] = e.target.value;
        this.setState(newState);
    }

    getDescriptionString() {
        if (this.props.analysesParameters) {
            const metapath = this.props.analysesParameters.metapath;
            const analyses = this.props.analysesParameters.analyses.join(', ');
            const constaintDescriptions = {};
            Object.keys(this.state.constraints).forEach((entity, index) => {
                constaintDescriptions[entity] = generateGroupsOfDisjunctions(this.state.constraints[entity], `${entity}.`);
            });
            const constraints = this.constraintsSummary(constaintDescriptions);

            let statusString = '';
            switch (this.props.analysesParameters.status) {
                case 'PENDING':
                    statusString = 'Executing';
                    break;
                case 'COMPLETE':
                    statusString = 'Completed';
                    break;
                default:
                    statusString = 'Unknown state when';
            }

            return `${statusString} ${analyses} for metapath ${metapath} and constraint(s): ${constraints}.`;
        } else {
            return '';
        }
    }





    setInterpretation(dataset, metapath, description) {
        this.setState({
            description: [dataset, metapath, description]
        })
    }

    constraintsSummary(constraintSegments) {
        const constraintExpressions = Object.keys(constraintSegments).map(entity => {
            const entityFields = constraintSegments[entity];
            const fieldExpressions = entityFields.map(field => {
                const disjunctionExpressions = field.map(disjunction => {
                    if (disjunction.length > 1) {
                        const conjunctionExpressions = disjunction.map(conjunctionElement => {
                            // console.log(conjunctionElement);
                            return conjunctionElement.field + conjunctionElement.condition;
                        });
                        if (field.length > 1) {
                            return `(${conjunctionExpressions.join(' and ')})`;
                        } else {
                            return `${conjunctionExpressions.join(' and ')}`;
                        }
                    } else {
                        return disjunction[0].field + disjunction[0].condition;
                    }

                });
                return disjunctionExpressions.join(' or ');
            });
            return fieldExpressions.filter(expression => !!expression).join(', ');
        });
        return constraintExpressions.filter(expression => !!expression).join(', ');
    }

    clearMetapath() {
        const newState = {
            constraints: {},
            metapathStr: '',
            metapath: [],
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

    addMetapath() {
        this.setState({
            metapath: [ this.state.metapath[0]],
            metapathStr: 'A',
        });
    }

    render() {
        const datasetOptions = this.getDatasetOptions();
        const schema = this.getSchema();
        const validMetapath = true; // this._metapathPanelRef.checkSymmetricMetapath();
        const validConstraints = true; // this._metapathPanelRef.checkConstraints();
        const validAnalysisType = this.state.analysis.length !== 0;
        const validTargetEntity = (!this.state.analysis.includes('Similarity Search') || (this.state.analysis.includes('Similarity Search') && this.state.targetEntity !== ''));
        const { selectedEntity, selectFieldOptions }: any = this.getSelectFieldOptions();
console.warn(this.state.metapath);
console.warn(this.state.metapathStr);

        let datasetToUse;
        if (this.props.schemas) {
            datasetToUse = this.getCurrentDataset();
        }

        const rankingLabel = <span>
			Ranking <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle"
                                     title="Ranking analysis is perfomed using PageRank." />
		</span>;
        const communityLabel = <span>
			Community Detection <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle"
                                                 title="Community Detection analysis is perfomed using Louvain Modularity method." />
		</span>;
        const simJoinLabel = <span>
			Similarity Join <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle"
                                             title="Similarity Join is perfomed using JoinSim." />
		</span>;
        const simSearchLabel = <span>
			Similarity Search <FontAwesomeIcon style={{ color: '#17a2b8' }} icon="question-circle"
                                               title="Similarity Search is perfomed using JoinSim similarity measure." />

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
                                            placeholder={_.isEmpty(this.state.metapath) ? 'First, select a metapath' : `Search for ${selectedEntity} entities`}
                                            key={`similarity-search-field${this.state.metapath.length > 0 ? '-for-' + this.state.metapath[0].data('label') : ''}`}
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
                                            disabled={_.isEmpty(this.state.metapath)}
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
                                            {this.state.metapath.length > 0
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
                                    this.state.metapathStr &&
                                    <span>
                                        <Button outline color="success" size='sm' style={{ marginRight: '10px'}} onClick={this.addMetapath.bind(this)}>
                                            <FontAwesomeIcon icon={ faPlus } /> Add metapath
                                        </Button>
                                        <Button outline color={'danger'} onClick={this.clearMetapath.bind(this)} size={'sm'}>
                                            <FontAwesomeIcon icon={faTimes} /> Clear metapath
                                        </Button>
                                    </span>
                                }
                            </Col>
                        </Row>
                        {(this.props.schemas) &&
                        <MetapathPanel
                            ref={ (r) => { this._metapathPanelRef = r }}
                            metapath={this.state.metapath}
                            metapathStr={this.state.metapathStr}
                            schema={this.props.schemas[datasetToUse]}
                            dataset={datasetToUse}
                            analysis={this.state.analysis}
                            constraints={this.state.constraints}
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
                            handleRemoval={this.handleConstraintRemoval.bind(this)}
                            handleSelectFieldChange={this.handleSelectFieldChange.bind(this)}
                            handleMultipleAddition={this.handleMultipleConditionsAddition.bind(this)}
                            handlePredefinedMetapathAddition={this.setMetapath.bind(this)}
                            />                                   
                        }
                    </Col>
                </Row>
                <Row className={'mt-4'}>
                    <Col md={{ size: 4, offset: 4 }}>
                        <Button block color="success"
                                disabled={this.props.loading || !validMetapath || !validConstraints || !validTargetEntity}
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
                                            {this.getDescriptionString()}
                                            {/* {this.props.progress && this.props.progress < 100 ?
                                                <Button size={'sm'} className={'badge btn-danger'}><FontAwesomeIcon
                                                    icon={faTimes} /> Cancel analysis</Button> : ''} */}
                                        </Col>
                                    </Row>
                                }
                                {
                                    (this.props.loading) && <Progress animated color="info"
                                                                      value={this.props.progress}>{this.props.progressMsg}</Progress>
                                }
                                <ResultsPanel
                                    uuid={this.props.uuid}
                                    description={this.getDescriptionString()}
                                    results={this.props.results}
                                    analysis={this.props.analysis}
                                    analysisId={this.props.uuid}
                                    loadMore={this.loadMoreResults.bind(this)}
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
    analysesParameters: storeState.analysis.analysesParameters,
    error: storeState.analysis.error,
    results: storeState.analysis.results,
    uuid: storeState.analysis.uuid,
    analysis: storeState.analysis.analysis,
    schemas: storeState.datasets.schemas,
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




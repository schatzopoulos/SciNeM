import './results.scss';

import React, { useRef, useState } from 'react';
import {
    Button,
    ButtonGroup,
    Col,
    Nav,
    NavItem,
    NavLink,
    Row,
    TabContent,
    TabPane,
    Modal,
    ModalFooter,
    ModalBody,
    UncontrolledButtonDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Breadcrumb,
    BreadcrumbItem,
} from 'reactstrap';
import classnames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faChartBar, faLayerGroup, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import ResultsTable from './results-table';
import axios from 'axios';
import FileSaver from 'file-saver';
import _ from 'lodash';
import { Bar } from 'react-chartjs-2';
import HinGraph from 'app/modules/analysis/results/hin-graph';
import { threadId } from 'worker_threads';

export interface IResultsPanelProps {
    uuid: any,
    description: string,
    results: any,
    analysis: string,
    analysisId: string,
    loadMore: any,
    getHierarchicalResults: any,
    rerun: any,
}

export class ResultsPanel extends React.Component<IResultsPanelProps> {
    readonly state: any = {
        activeAnalysis: '',
        selectedEntries: [],
        visualizationModalOpen: '',
        networkModalOpen: '',
        hierarchyPath: {
            'Community Detection': [],
            'Community Detection - Ranking': [],
        },
    };

    constructor(props) {
        super(props);
    }

    componentDidUpdate(prevProps) {

        if (this.state.activeAnalysis === '' && !_.isEmpty(this.props.results)) {
            this.setState({
                activeAnalysis: Object.keys(this.props.results)[0]
            });
        }

        // new analysis, reset state
        if (prevProps.uuid !== this.props.uuid) {
            this.setState({
                activeAnalysis: ''
            });
        }
    }

    componentDidMount() {
        if (this.state.activeAnalysis === '' && !_.isEmpty(this.props.results)) {
            this.setState({
                activeAnalysis: Object.keys(this.props.results)[0]
            });
        }
    }

    downloadResults(onlySelected) {
        if (!onlySelected) {
            axios.get('api/datasets/download', {
                params: {
                    analysisType: this.state.activeAnalysis,
                    id: this.props.analysisId
                },
                responseType: 'blob'
            }).then(response => {
                FileSaver.saveAs(response.data, 'results.csv');
            });
        } else {
            const results = this.props.results[this.state.activeAnalysis];
            const headers = results.meta.headers.filter(header => header !== 'resultIndex');
            const tsvRows = [headers];
            this.state.selectedEntries.forEach(entry => {
                const docObject = results.docs.find(doc => doc.resultIndex === entry);
                const docRow = headers.map(header => docObject[header]);
                tsvRows.push(docRow);
            });
            const tsvContent = tsvRows.map(e => e.join('\t')).join('\n');
            const conditionsBlob = new Blob([tsvContent]);
            FileSaver.saveAs(conditionsBlob, 'results.csv');
        }
    }

    downloadConditions() {
        const results = this.props.results[this.state.activeAnalysis];
        const selectField = (this.state.activeAnalysis !== 'Similarity Search') ? results.meta.analysis_domain.selectField : 'Entity 2';
        const conditionValues = {};
        this.state.selectedEntries.forEach((entry, index) => {
            const entryObj = results.docs.find(doc => doc.resultIndex === entry);
            const entryValue = entryObj[selectField];
            if (!Object.prototype.hasOwnProperty.call(conditionValues, entryValue)) {
                if (index > 0) {
                    conditionValues[entryValue] = {
                        logicOp: 'or',
                        operation: '=',
                        value: entryValue
                    };
                } else {
                    conditionValues[entryValue] = {
                        operation: '=',
                        value: entryValue
                    };
                }
            }
        });
        const jsonArray = Object.keys(conditionValues).map(key => conditionValues[key]);
        const jsonArrayString = JSON.stringify(jsonArray, null, 4);
        const conditionsBlob = new Blob([jsonArrayString]);
        FileSaver.saveAs(conditionsBlob, 'conditions.json');
    }

    tryAgain() {
        this.props.rerun(null, this.props.analysis);
    }

    toggle(analysis) {
        if (this.state.activeAnalysis !== analysis) {
            this.setState({
                activeAnalysis: analysis,
                selectedEntries: []
            });
        }
    }

    handleSelectionChange(selections) {
        this.setState({
            selectedEntries: selections
        });
    }

    toggleVisualizationModal(modalId) {
        this.setState({
            visualizationModalOpen: this.state.visualizationModalOpen === modalId ? '' : modalId
        });
    }

    toggleNetworkModal(modalId) {
        this.setState({
            networkModalOpen: this.state.networkModalOpen === modalId ? '' : modalId
        });
    }

    transformVisualizationLabel(tooltipItem, data) {
        let label = data.datasets[tooltipItem.datasetIndex].label || '';

        if (label) {
            label += ': ';
        }

        const value = tooltipItem.yLabel;
        const attemptedFloatCast = Number.parseFloat(value);
        const finalValue = (!isNaN(attemptedFloatCast) && attemptedFloatCast % 1 !== 0 && attemptedFloatCast.toString() === value.toString()) ? Math.round(attemptedFloatCast * 1000000) / 1000000 : value;
        label += finalValue;
        return label;
    }

    getHierarchicalResults(communityId) {
        
        const newState = { ... this.state };

        newState.hierarchyPath[this.state.activeAnalysis].push(communityId);
        this.setState(newState, () => { 
            this.props.getHierarchicalResults(this.state.activeAnalysis, communityId);
        });
    }

    getAnalysisDescription() {
        let description = this.props.description;
        if (description.startsWith("Executing") && !_.isEmpty(this.props.results)) {
            description = description.replace("Executing", "Completed");
        }
        return description;
    }

    render() {
        let resultPanel;
        let hierarchical = false;

        if (!_.isEmpty(this.props.results)) {

            const result = this.props.results[this.state.activeAnalysis];
            const normalizeToId = str => str.replace(/(((\s*[-]\s*)+)|(\s))+/g, '-').toLowerCase();
            let plotData = [];
            let areCommunityResults = false;
            if (this.state.activeAnalysis) {
                const assignedHeaders = [...result.meta.headers];
                const selectField = result.meta.analysis_domain.selectField;
                const entity = result.meta.analysis_domain.entity;
                const assignedDocs = result.docs;
                const aliases = {};
                aliases[selectField] = `${entity} ${selectField}`;
                let showRank = false;
                let groupedDocs = null;

                hierarchical = this.state.activeAnalysis.startsWith("Community Detection")
                                        && (result.meta.results_type === "hierarchical");

                switch (this.state.activeAnalysis) {
                    case 'Similarity Search':
                    case 'Similarity Join':
                        aliases['Entity 1'] = `${entity} 1 ${selectField}`;
                        aliases['Entity 2'] = `${entity} 2 ${selectField}`;
                        resultPanel = <ResultsTable
                            docs={assignedDocs}
                            headers={assignedHeaders}
                            selectField={['Entity 1', 'Entity 2']}
                            selections={this.state.selectedEntries}
                            aliases={aliases}
                            showRank={showRank}
                            communityView={false}
                            handleSelectionChange={this.handleSelectionChange.bind(this)}
                        />;
                        break;
                    case 'Ranking':
                    case 'Ranking - Community Detection':
                        showRank = true;
                        plotData = assignedDocs.map(doc => [doc[selectField], doc['Ranking Score']]).sort((docA, docB) => {
                            return Number.parseFloat(docB[1]) - Number.parseFloat(docA[1]);
                        });
                        resultPanel = <ResultsTable
                            docs={assignedDocs}
                            headers={assignedHeaders}
                            aliases={aliases}
                            selectField={selectField}
                            selections={this.state.selectedEntries}
                            showRank={showRank}
                            communityView={false}
                            handleSelectionChange={this.handleSelectionChange.bind(this)}
                        />;
                        break;
                    case 'Community Detection - Ranking':
                        showRank = true;

                        if (hierarchical) {
                            plotData = result.docs.map (e => {
                                return [
                                    "Community " + e["community"],
                                    _.sumBy(e.members, (e2) => { return parseFloat(e2["Ranking Score"]); }) / e.count
                                ]
                            });
                        } else {
                            groupedDocs = _.groupBy(result.docs, doc => doc.Community);
                            plotData = _.map(_.keys(groupedDocs), communityId => {
                                const groupData = groupedDocs[communityId];

                                const sumOfGroupRankingScores = _.reduce(groupData, (sum, current) => sum + Number.parseFloat(current['Ranking Score']), 0);
                                return ['Community ' + communityId, sumOfGroupRankingScores / groupData.length];
                            });
                        }
                        plotData = plotData.sort((docA, docB) => {
                            return docB[1] - docA[1];
                        });
                    // falls through
                    case 'Community Detection':
                        areCommunityResults = true;

                        resultPanel = <ResultsTable
                            docs={result.docs}
                            headers={result.meta.headers}
                            aliases={aliases}
                            selectField={selectField}
                            showRank={showRank}
                            selections={this.state.selectedEntries}
                            communityView={true}
                            handleSelectionChange={this.handleSelectionChange.bind(this)}
                            hierarchical={hierarchical}
                            getHierarchicalResults={this.getHierarchicalResults.bind(this)}
                            level={result.meta.results_level}
                        />;
                        break;
                    default:
                        resultPanel = '';
                        break;
                }
            } else {
                resultPanel = '';
            }

            return (<div>
                <h2>Results</h2>
                <p>{ this.getAnalysisDescription() }</p>
                <Nav tabs>
                    {
                        _.map(this.props.results, ({ docs, meta }, analysis) => {
                            return <NavItem key={analysis}>
                                <NavLink
                                    className={classnames({ active: this.state.activeAnalysis === analysis })}
                                    onClick={this.toggle.bind(this, analysis)}
                                >
                                    {analysis}
                                </NavLink>
                            </NavItem>;
                        })
                    }

                </Nav>
                <TabContent activeTab={this.state.activeAnalysis}>
                    {
                        _.map(this.props.results, ({ docs, meta }, analysis) => {

                            return <TabPane tabId={analysis} key={analysis}>
                                {
                                    (docs.length === 0) ?
                                        <div key={analysis} style={{ textAlign: 'center' }}>No results found for the specified query!<br />
                                            {/* {
                                            (this.props.analysis === 'simjoin' || this.props.analysis === 'simsearch') &&
                                            <span>
                                                Please try again with more loose analysis parameters. <br/>
                                                <Button onClick={this.tryAgain.bind(this)} color='success' size='sm'><FontAwesomeIcon icon="play" />  Try again</Button>
                                            </span>
                                        } */}
                                        </div>

                                        : <div>
                                            <br />
                                            <Row>
                                                <Col xs={'12'} lg={'6'} className="small-grey">
                                                    {
                                                        (hierarchical) ? 
                                                            <span>
                                                                Displaying {meta.community_counts} communities on hierachy level {meta.results_level}
                                                            </span>
                                                        : 
                                                            <span>
                                                                Displaying {areCommunityResults ? _.keys(_.groupBy(docs, doc => doc.Community)).length : docs.length} out
                                                                of {meta.totalRecords} {areCommunityResults ? 'communities' : 'results'}{this.state.selectedEntries.length > 0 ? `. (${this.state.selectedEntries.length} ${areCommunityResults ? 'members ' : ''}selected)` : ''}
                                                            </span>    
                                                    }
                                                </Col>
                                            </Row>
                                            <Row className={'justify-content-between mt-1'}>
                                                {                                                 
                                                        
                                                    (hierarchical) && 
                                                        <>
                                                        <Col>
                                                            <Breadcrumb tag="nav" listTag="div" className="small-grey">
                                                                <BreadcrumbItem tag="a" href="#" onClick={(e) => { 
                                                                        e.preventDefault();
                                                                        this.props.getHierarchicalResults(this.state.activeAnalysis, null); 

                                                                        const newState = { ... this.state };
                                                                        newState['hierarchyPath'][this.state.activeAnalysis] = [];
                                                                        this.setState(newState);
                                                                    }}>root
                                                                </BreadcrumbItem>       
                                                                {
                                                                    this.state.hierarchyPath[this.state.activeAnalysis].map( (communityId, index) => {
                                                                        
                                                                        const isActive = (index === this.state.hierarchyPath[this.state.activeAnalysis].length-1);

                                                                        return <BreadcrumbItem key={index} tag={ (isActive) ? 'span' : 'a'} href="#" active={ isActive } onClick={(e) => { 
                                                                            e.preventDefault();
                                                                            this.props.getHierarchicalResults(this.state.activeAnalysis, communityId);
                                                                            const newState = { ... this.state };
                                                                            newState['hierarchyPath'][this.state.activeAnalysis] = newState['hierarchyPath'][this.state.activeAnalysis].slice(0, index+1)
                                                                            this.setState(newState);
                                                                        }}
                                                                        title={`Community: ${communityId}`}>
                                                                            {communityId}
                                                                        </BreadcrumbItem>;
                                                                    })
                                                                }
                                                            </Breadcrumb>
                                                        </Col>
                                                        </>
                                                }

                                                <Col xs={'auto'}>
                                                    {plotData && plotData.length > 0 &&
                                                    (analysis==='Ranking'
                                                        ? <UncontrolledButtonDropdown>
                                                            <DropdownToggle caret color={'dark'} size={'sm'}>
                                                                <FontAwesomeIcon icon={faChartBar} /> Visualize
                                                            </DropdownToggle>
                                                            <DropdownMenu>
                                                                <DropdownItem onClick={this.toggleVisualizationModal.bind(this, `vis-${normalizeToId(analysis)}`)}>Scores bar chart</DropdownItem>
                                                                <DropdownItem onClick={this.toggleNetworkModal.bind(this, `net-${normalizeToId(analysis)}`)}>Top-10 network</DropdownItem>
                                                            </DropdownMenu>
                                                        </UncontrolledButtonDropdown>
                                                        : <Button size={'sm'} color={'dark'}
                                                                  onClick={this.toggleVisualizationModal.bind(this, `vis-${normalizeToId(analysis)}`)}><FontAwesomeIcon
                                                            icon={faChartBar} /> Visualize</Button>)
                                                    }
                                                </Col>
                                                {
                                                    /* we want the button to appear in all cases except similarity join.

                                                       especially for the case of similarity search alter the button title
                                                       to indicate that conditions will be produced based on the second
                                                       column
                                                    */
                                                }
                                                <Col xs={'auto'}>
                                                    {(this.state.selectedEntries.length > 0) &&
                                                    <ButtonGroup>
                                                        {this.state.activeAnalysis !== 'Similarity Join' &&
                                                        <Button
                                                            size={'sm'}
                                                            className={'text-nowrap'}
                                                            title={'Create a conditions JSON file from selected entities'}
                                                            outline
                                                            onClick={this.downloadConditions.bind(this)}
                                                        ><FontAwesomeIcon icon={faFile} /> Create conditions
                                                            file</Button>
                                                        }
                                                        <Button
                                                            size={'sm'}
                                                            className={'text-nowrap'}
                                                            title={'Download a CSV file containing the results for the selected entities'}
                                                            outline
                                                            onClick={this.downloadResults.bind(this, true)}
                                                        ><FontAwesomeIcon icon="download" /> Download selected</Button>
                                                    </ButtonGroup>
                                                    }
                                                    <Button
                                                        color="info"
                                                        size='sm'
                                                        className={'text-nowrap'}
                                                        style={{ marginLeft: '15px' }}
                                                        title={'Download all results in a CSV file'}
                                                        outline
                                                        onClick={this.downloadResults.bind(this, false)}
                                                    ><FontAwesomeIcon icon="download" /> Download all</Button>
                                                </Col>
                                            </Row>
                                            <Modal className={'modal-xl'}
                                                   isOpen={this.state.networkModalOpen === `net-${normalizeToId(analysis)}`}
                                                   toggle={this.toggleNetworkModal.bind(this, `net-${normalizeToId(analysis)}`)}>
                                                <ModalBody>
                                                    <Row className={'justify-content-center'}>
                                                        <Col xs={'12'}>
                                                            <HinGraph data={result?result.hin:null}/>
                                                        </Col>
                                                    </Row>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Row>
                                                        <Col xs={'auto'}>
                                                            <Button color={'dark'}
                                                                    onClick={this.toggleNetworkModal.bind(this, `net-${normalizeToId(analysis)}`)}>Close</Button>
                                                        </Col>
                                                    </Row>
                                                </ModalFooter>
                                            </Modal>
                                            <Modal className={'modal-xl'}
                                                   isOpen={this.state.visualizationModalOpen === `vis-${normalizeToId(analysis)}`}
                                                   id={`vis-${normalizeToId(analysis)}`}
                                                   toggle={this.toggleVisualizationModal.bind(this, `vis-${normalizeToId(analysis)}`)}>
                                                <ModalBody>
                                                    <Row className={'justify-content-center'}>
                                                        <Col xs={'12'}>
                                                            <Bar data={{
                                                                labels: plotData.map(d => d[0]),
                                                                datasets: [
                                                                    {
                                                                        label: this.state.activeAnalysis === 'Community Detection - Ranking' ? 'Average Community Ranking Score' : 'Ranking Score',
                                                                        backgroundColor: 'rgba(23,162,184,0.6)',
                                                                        borderColor: 'rgba(23,162,184,0.8)',
                                                                        borderWidth: 1,
                                                                        hoverBackgroundColor: 'rgba(23,162,184,1)',
                                                                        hoverBorderColor: 'rgba(23,162,184,1)',
                                                                        data: plotData.map(d => d[1])
                                                                    }
                                                                ]
                                                            }}
                                                                 width={1024}
                                                                 height={576}
                                                                 options={{
                                                                     maintainAspectRation: false,
                                                                     legend: {
                                                                         onClick: null
                                                                     },
                                                                     scales: {
                                                                         xAxes: [{
                                                                             display: false
                                                                         }]
                                                                     },
                                                                     tooltips: {
                                                                         callbacks: {
                                                                             label: this.transformVisualizationLabel
                                                                         }
                                                                     }
                                                                 }} />
                                                        </Col>
                                                    </Row>
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Row>
                                                        <Col xs={'auto'}>
                                                            <Button color={'dark'}
                                                                    onClick={this.toggleVisualizationModal.bind(this, `vis-${normalizeToId(analysis)}`)}>Close</Button>
                                                        </Col>
                                                    </Row>
                                                </ModalFooter>
                                            </Modal>
                                            { resultPanel }
                                            {
                                                (result && result.meta.links.hasNext) &&
                                                <Row className="">
                                                    <Button style={{ float: 'none', margin: 'auto' }} color="info" outline
                                                            size="sm"
                                                            title="Load more results"
                                                            onClick={this.props.loadMore.bind(this, this.state.activeAnalysis, result.meta.page + 1)}>
                                                        <FontAwesomeIcon icon="angle-double-down" /> Load More
                                                    </Button>
                                                </Row>

                                            }
                                        </div>
                                }
                            </TabPane>;
                        })
                    }
                </TabContent>
            </div>);
        }
        return '';
    }
};

export default ResultsPanel;




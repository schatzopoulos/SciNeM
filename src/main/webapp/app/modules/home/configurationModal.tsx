import React, { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import {
    Button,
    Card,
    Col,
    Container,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Row,
} from 'reactstrap';
import './feedback.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


const ConfigurationModal = (props) => {

    const commAlgorithms = ["LPA (GraphFrames)", "LPA", "OLPA", "PIC", "HPIC"];

    const toggleConfiguration = () => {
        props.toggleConfiguration();
    }

    const handleAdvancedOptions = (e) => {
        props.handleAdvancedOptions(e);
    };


    // commThreshold: 0,
    // commNumOfCommunities: 20,
    // commRatio: 0.6,
    return (
        <Modal isOpen={props.isOpen}
            toggle={props.toggleConfiguration} className={'w-75 mw-100'}>
            <ModalHeader>
                Analysis configuration
            </ModalHeader>
            <ModalBody>
                <Container>
                    <Row>
                        <Col md='3'>
                            <Card className={'configuration-card'}>
                                <h5>General</h5>

                                <Label for="edgesThreshold">
                                    Minimum number of instances for a metapath-based
                             connection to be considered <FontAwesomeIcon
                                        style={{ color: '#17a2b8' }} icon="question-circle"
                                        title="Connections with fewer occurences are not considered in the analysis; it affects the overall efficiency." />
                                </Label>
                                <Input id="edgesThreshold"
                                    value={props.edgesThreshold}
                                    bsSize="sm" type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.edgesThreshold === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                             </span>
                                }
                            </Card>
                        </Col>
                        <Col md='3'>
                            <Card className={'configuration-card'}>
                                <h5>Ranking</h5>
                                <Label for="prAlpha">
                                    Alpha <FontAwesomeIcon style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="The random reset propability of the PageRank algorithm." />
                                </Label>
                                <Input id="prAlpha" value={props.prAlpha}
                                    bsSize="sm"
                                    type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.prAlpha === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                             </span>
                                }
                                <br />
                                <Label for="prTol">
                                    Tolerance <FontAwesomeIcon
                                        style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="The tolerance allowed for convergence." />
                                </Label>
                                <Input id="prTol" value={props.prTol} bsSize="sm"
                                    type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.prTol === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                             </span>
                                }
                            </Card>
                        </Col>
                        <Col md='3'>
                            <Card className={'configuration-card'}>
                                <h5>Similarity Analyses</h5>

                                <Label for="searchK">
                                    k <FontAwesomeIcon style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="Number of retrieved results." />
                                </Label>
                                <Input id="searchK" value={props.searchK}
                                    bsSize="sm"
                                    type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.searchK === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                             </span>
                                }

                                <br />
                                <Label for="hashTables">
                                    Hash Tables <FontAwesomeIcon
                                        style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="Number of hash tables used for LSH." />
                                </Label>
                                <Input id="hashTables" value={props.hashTables}
                                    bsSize="sm"
                                    type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.hashTables === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                                    </span>
                                }
                                <br />
                                <Label for="simMinValues">
                                    Min. values <FontAwesomeIcon
                                        style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="Min number of values for each entity." />
                                </Label>
                                <Input id="simMinValues" value={props.simMinValues}
                                    bsSize="sm"
                                    type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.simMinValues === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                                    </span>
                                }
                            </Card>

                        </Col>
                        <Col md='3'>
                            <Card className={'configuration-card'}>
                                <h5>Community Detection</h5>

                                <Label for="commAlgorithm">
                                    Algorithm <FontAwesomeIcon
                                        style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="Community Detection Algorithm to be used." />
                                </Label>
                                <Input value={props.commAlgorithm} type="select" name="commAlgorithm" id="commAlgorithm"
                                    onChange={handleAdvancedOptions}>
                                    {
                                        _.map(commAlgorithms, (value, key) => {
                                            const isDisabled = (value === "PIC" || value === "HPIC" || value === "OLPA");
                                            return <option key={value} value={value} disabled={isDisabled}>{value}</option>;
                                    })}
                                </Input>
                                <br />
                                <Label for="commMaxSteps">
                                    Iterations <FontAwesomeIcon
                                        style={{ color: '#17a2b8' }}
                                        icon="question-circle"
                                        title="Number of iterations for LPA." />
                                </Label>
                                <Input id="commMaxSteps" value={props.commMaxSteps}
                                    bsSize="sm"
                                    type='number'
                                    onChange={handleAdvancedOptions} />
                                {
                                    (props.commMaxSteps === '') &&
                                    <span className="attribute-type text-danger">
                                        This field cannot be empty.
                                    </span>
                                }

                                {
                                (["LPA", "OLPA"].includes(props.commAlgorithm)) &&
                                <span>
                                    <br />
                                    <Label for="commStopCriterion">
                                        Stop Criterion <FontAwesomeIcon
                                            style={{ color: '#17a2b8' }}
                                            icon="question-circle"
                                            title="the number of times that a vertex can have the same community affiliation(s) before it stops been included in the remaining supersteps of the LPA (OLPA).
                                            " />
                                    </Label>
                                    <Input id="commStopCriterion" value={props.commStopCriterion}
                                        bsSize="sm"
                                        type='number'
                                        onChange={handleAdvancedOptions} />
                                    {
                                        (props.commStopCriterion === '') &&
                                        <span className="attribute-type text-danger">
                                            This field cannot be empty.
                                        </span>
                                    }
                                </span>
                                }
                                {
                                (props.commAlgorithm === "OLPA") &&
                                <span>
                                    <br />
                                    <Label for="commThreshold">
                                        Threshold <FontAwesomeIcon
                                            style={{ color: '#17a2b8' }}
                                            icon="question-circle"
                                            title="A double value used in each iteration of Pregel in OLPA to determine for each vertex which of the incoming communities from its neighbors will be included in the community affiliations of a vertex.
                                            " />
                                    </Label>
                                    <Input id="commThreshold" value={props.commThreshold}
                                        bsSize="sm"
                                        type='number'
                                        onChange={handleAdvancedOptions} />
                                    {
                                        (props.commThreshold === '') &&
                                        <span className="attribute-type text-danger">
                                            This field cannot be empty.
                                        </span>
                                    }
                                </span>
                                }
                                {
                                (["PIC", "HPIC"].includes(props.commAlgorithm)) &&
                                <span>
                                    <br />
                                    <Label for="commNumOfCommunities">
                                        Num. of Communities <FontAwesomeIcon
                                            style={{ color: '#17a2b8' }}
                                            icon="question-circle"
                                            title="The number of communities given to perform the PIC algorithm or the initial number of communities given to perform the HPIC algorithm.
                                            " />
                                    </Label>
                                    <Input id="commNumOfCommunities" value={props.commNumOfCommunities}
                                        bsSize="sm"
                                        type='number'
                                        onChange={handleAdvancedOptions} />
                                    {
                                        (props.commNumOfCommunities === '') &&
                                        <span className="attribute-type text-danger">
                                            This field cannot be empty.
                                        </span>
                                    }
                                </span>
                                }
                                {
                                (props.commAlgorithm === "HPIC") &&
                                <span>
                                    <br />
                                    <Label for="commRatio">
                                        Ratio <FontAwesomeIcon
                                            style={{ color: '#17a2b8' }}
                                            icon="question-circle"
                                            title="A double value which reduces the number of communities on each level of HPIC algorithm." />
                                    </Label>
                                    <Input id="commRatio" value={props.commRatio}
                                        bsSize="sm"
                                        type='number'
                                        onChange={handleAdvancedOptions} />
                                    {
                                        (props.commRatio === '') &&
                                        <span className="attribute-type text-danger">
                                            This field cannot be empty.
                                        </span>
                                    }
                                </span>
                                }
                            </Card>
                        </Col>

                    </Row>
                </Container>
            </ModalBody>
            <ModalFooter>
                <Button color={'info'}
                    onClick={toggleConfiguration}><FontAwesomeIcon
                        icon={'save'} /> Save</Button>
            </ModalFooter>
        </Modal>
    );
};


export default ConfigurationModal;

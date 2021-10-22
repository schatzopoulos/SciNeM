import React from 'react';
import { Button, Row, Col, Modal, ModalHeader, ModalBody, Spinner, ListGroup, ListGroupItem } from 'reactstrap';
import EntityBox from './entity-box';
import EntityConnector from './entity-connector';
import EntityInsertionModal from './entity-insertion-modal';
import MetapathControl from './metapath-control';
import Recommendation from 'app/modules/metapath/recommendation';
import PredefinedMetapathBrowser from 'app/modules/metapath/predefined-metapath-browser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faEdit } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';
import { ACTION_TYPES as metapathActions} from 'app/modules/metapath/metapath.reducer';
import { faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import { metapathToString } from '../../shared/util/metapath-utils';

interface MetapathPanelProps {
    constraints: any,
    dataset: string,
    metapath: any,
    queries: any,
    currentQueryIdx: number,
    analysis: any,
    schema: any,   
    selectField: string,
    selectFieldOptions: any,
    metapathLoading: any,
    metapathInfo: any,
    onNewEntity: any,
    onDelete: any,
    onRecommendationAccept: any,
    handleSwitch: any,
    handleDropdown: any,
    handleLogicDropdown: any,
    handleInput: any,
    handleAddition: any,
    handleRemoval: any,
    handleClear: any,
    handleNewMetapath: any,
    handleSelectFieldChange: any,
    handleMultipleAddition: any,
    handlePredefinedMetapathAddition: any,
    handleMetapathSelection: any,
    handleMetapathDeletetion: any,
}

class MetapathPanel extends React.Component<MetapathPanelProps> {
    readonly state = {
        entityModalOpen: false,
        predefinedMetapathsModalOpen: false
    };
    nodes = null;

    constructor(props) {
        super(props);
        if (this.props.schema) {
            this.nodes = this.getAvailableNodesFromSchema(this.props.schema);
        }
    }

    getAvailableNodesFromSchema(schema) {
        return schema.elements.filter(element => element.data.label !== undefined).map(element => {
            return { id: element.data.id, label: element.data.label };
        });
    }

    componentDidMount() {
        if (this.props.schema) {
            this.nodes = this.getAvailableNodesFromSchema(this.props.schema);
        }
    }

    componentDidUpdate() {
        if (this.props.schema) {
            this.nodes = this.getAvailableNodesFromSchema(this.props.schema);
        }
    }

    getMetapathRecommendation(metapathEntities) {
        const metapathString = this.props.metapath.filter(element => element.data('label') !== undefined).map(element => element.data('label')[0]).join('');
        const isSymmetric = (metapathStr) => metapathStr.substr(0, Math.floor(metapathStr.length / 2)).split('').reverse().join('') === metapathStr.substr(Math.ceil(metapathStr.length / 2));
        return isSymmetric(metapathString) ? [] : metapathEntities.slice(0, metapathEntities.length - 1).reverse();
    }

    toggleEntitySelectionModal() {
        this.setState({
            entityModalOpen: (!this.state.entityModalOpen)
        });
    }

    togglePredefinedMetapathsModal() {
        this.setState({
                predefinedMetapathsModalOpen: !this.state.predefinedMetapathsModalOpen
        });
    }

    isMetapathValid(metapath, constraints) {
        const metapathStr = metapathToString(metapath);
        return this.checkMetapathDefined(metapathStr) && this.checkMetapathLength(metapathStr) && this.checkSymmetricMetapath(metapathStr) && this.checkConstraints(constraints);
    }

    generateNotification(metapath, constraints) {
        const metapathStr = metapathToString(metapath);

        if (this.checkMetapathDefined(metapathStr)) {
            if (this.checkMetapathLength(metapathStr)) {
                if (this.checkSymmetricMetapath(metapathStr)) {
                    if (this.checkConstraints(constraints)) {
                        return "Valid metapath!";
                    }
                    return" At least one constraint must be defined";
                }
                return "Metapath must be symmetric i.e. start and end with the same entity";
            }
            return "Metapath must contain at least 3 entities";
        }
    }

    checkMetapathDefined(metapathStr) {
        return metapathStr.length > 0;
    }

    checkMetapathLength(metapathStr) {
        return (metapathStr.length >= 3);
    }

    checkSymmetricMetapath(metapathStr) {

        let metapath = metapathStr.slice(0);

        if (metapath.length < 3)
            return false;

        const midPos = Math.floor(metapath.length / 2);

        // if metapath length is even, remove mid character
        if (metapath.length % 2 !== 0) {
            metapath = metapath.slice(0, midPos) + metapath.slice(midPos + 1);
        }

        const firstHalf = metapath.substr(0, midPos);
        const lastHalf = metapath.substr(midPos, metapath.length - 1);

        return (firstHalf === this.reverseString(lastHalf));
    }

    reverseString(str) {
        const splitString = str.split('');
        const reverseArray = splitString.reverse();
        const joinArray = reverseArray.join('');
        return joinArray;
    }

    getMetapathString(metapath) {
        return metapath.map((entity, index) => { return entity.data('label'); }).join("-");
    }

    getCrudeInterpretation(metapathStr) {
        if (this.checkSymmetricMetapath(metapathStr)) {
            const targetEntity = this.props.metapath[0].data('label');
            if (this.props.metapath.length === 3) {
                const relatingEntity = this.props.metapath[1].data('label');
                return `Metapath will retrieve ${targetEntity} entities, that are connected with one ${relatingEntity} entity.`;
            } else {
                return `Metapath will retrieve ${targetEntity} entities, that are connected with the metapath: ${this.getMetapathString(this.props.metapath)}.`;
            }
        }
        return <div></div>;
    }

    checkConstraints(constraintsToCheck) {
        if (this.props.analysis === 'simjoin' || this.props.analysis === 'simsearch')
            return true;

        const constraints = {};
        _.forOwn(constraintsToCheck, (entityConstraint, entity) => {
            const e = entity.substr(0, 1);
            let entityConditions = [];

            _.forOwn(entityConstraint, ({ enabled, type, conditions }, field) => {
                if (enabled) {
                    entityConditions = conditions
                        .filter(element => element.value)
                        .map(element => {
                            let value;
                            if (type === 'numeric') {
                                value = parseInt(element.value, 10);
                            } else {
                                value = `'${element.value}'`;
                            }
                            return `${element.logicOp || ''} ${field} ${element.operation} ${value}`;
                        });
                }

                if (entityConditions.length > 0) {
                    constraints[e] = entityConditions.join(' ');
                }
            });
        });

        return !_.isEmpty(constraints);
    }

    getInterpretation() {
        if (this.props.metapathLoading === metapathActions.GET_METAPATH_DESCRIPTION) {
            return <Spinner size='sm' />;
        } else if (this.props.metapathInfo && this.props.metapathInfo.metapathDescription) {
            return this.props.metapathInfo.metapathDescription;
        }
        return this.getCrudeInterpretation(metapathToString(this.props.metapath));
    }

    render() {
        if (this.props.metapath && this.props.metapath.length > 0) {
            const idIndexedSchema = {};
            this.props.schema.elements.filter(element => element.data.label !== undefined).forEach(element => {
                idIndexedSchema[element.data.id] = element.data.label;
            });
            const metapathEntities = this.props.metapath.filter(element => element.data('label') !== undefined).map(element => element.data('id'));
            const metapathEntityBoxes = [];
            const metapathTypesSeen = [];
            const tempConstraints = { ...this.props.constraints };

            const recommendationList = this.getMetapathRecommendation(metapathEntities);
            metapathEntities.forEach( (element, index) => {
                if (metapathEntityBoxes.length > 0) {
                    metapathEntityBoxes.push(<EntityConnector key={`conn-${index}`} />);
                }
                if (!metapathTypesSeen.includes(element)) {
                    metapathTypesSeen.push(element);

                    metapathEntityBoxes.push(
                        <EntityBox key={index} className='' color="dark" disabled entity={element}
                                   constraints={tempConstraints[idIndexedSchema[element]]}
                                   idIndexedSchema={idIndexedSchema}
                                   dataset={this.props.dataset}
                                   primaryEntity={metapathEntityBoxes.length === 0}
                                   selectField={this.props.selectField}
                                   selectFieldOptions={metapathEntityBoxes.length === 0 ? this.props.selectFieldOptions : null}
                                   handleSelectFieldChange={this.props.handleSelectFieldChange}
                                   handleSwitch={this.props.handleSwitch}
                                   handleDropdown={this.props.handleDropdown}
                                   handleLogicDropdown={this.props.handleLogicDropdown}
                                   handleInput={this.props.handleInput}
                                   handleAddition={this.props.handleAddition}
                                   handleRemoval={this.props.handleRemoval}
                                   handleMultipleAddition={this.props.handleMultipleAddition} />
                    );
                    delete tempConstraints[element];
                } else {
                    metapathEntityBoxes.push(
                        <EntityBox key={index} className='' color="dark" disabled entity={element} constraintsControl={false}
                                   idIndexedSchema={idIndexedSchema}
                                   dataset={null} />
                    );
                }
            });
            const isCurrentMetapathValid = this.isMetapathValid(this.props.metapath, this.props.constraints);

            return (
                <Row>
                    <div className="col-8 ">
                        <Row>
                            <Col xs={8}>
                                <h5 className="col-12 pl-0">Metapath editor</h5>
                            </Col>

                            <Col xs={4} className={'text-right'}>
                                <Button outline color={'success'} size={'sm'} onClick={this.props.handleNewMetapath} title={ (!isCurrentMetapathValid) ? "The current metapath must be valid in order to add a new one." : "Add a new metapath" } 
                                disabled={false && !isCurrentMetapathValid // TODO remove false
                                }>
                                    <FontAwesomeIcon icon={faPlus} /> Add new
                                </Button>
                                &nbsp;
                                <Button outline color={'danger'} size={'sm'} onClick={this.props.handleClear} title="Clear current metapath">
                                    <FontAwesomeIcon icon={faTimes} /> Clear
                                </Button>
                            </Col>
                        </Row>
                        <Row>
                            <Col md='12' className="d-flex flex-wrap align-items-center ">
                                { metapathEntityBoxes }
                                <MetapathControl schema={this.props.schema} metapath={this.props.metapath}
                                                onNewEntity={this.props.onNewEntity} onDelete={this.props.onDelete} />
                                <Recommendation
                                    recommendationEntities={recommendationList}
                                    idIndexedSchema={idIndexedSchema}
                                    onRecommendationAccept={this.props.onRecommendationAccept} />
                            </Col>
                        </Row>
                        { 
                            isCurrentMetapathValid ?
                                <span className="text-success font-italic">
                                    <FontAwesomeIcon icon={faCheckCircle} title="Metapath is valid!"/> <small>{ this.getInterpretation() }</small>
                                </span>
                            : 
                                <span className="text-danger font-italic">
                                    <FontAwesomeIcon icon={faExclamationCircle} title="Metapath is invalid!" /> <small>{ this.generateNotification(this.props.metapath, this.props.constraints) }</small>
                                </span>
                        }
                    </div>
                    <div className="col-4 metapath-panel">
                        <Row>
                            <Col xs={8}>
                                <h5 className="col-12 pl-0">Selected metapath(s)</h5>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <ListGroup>
                                {
                                    this.props.queries.map( (q, i) => {

                                        const statusIcon = (this.isMetapathValid(q.metapath, q.constraints)) 
                                            ? <FontAwesomeIcon icon={faCheckCircle} title="Metapath is valid!"/>
                                            : <FontAwesomeIcon icon={faExclamationCircle} title={this.generateNotification(q.metapath, q.constraints)}/>

                                        return <ListGroupItem action key={i} active={i === this.props.currentQueryIdx} onClick={() => { this.props.handleMetapathSelection(i); }}>
                                            <Row className='small'>
                                                <Col md='9'>
                                                    {
                                                        (i === this.props.currentQueryIdx) 
                                                            ? <FontAwesomeIcon icon={faEdit} title="Currently editing this metapath"/>
                                                            : statusIcon
                                                    } { this.getMetapathString(q['metapath']) }
                                                </Col>
                                                <Col md='3' className="text-right">
                                                    <FontAwesomeIcon icon={faTimes} title="Delete metapath" onClick={this.props.handleMetapathDeletetion.bind(this, i)} />
                                                </Col>
                                            </Row>
                                        </ListGroupItem>;
                                    })
                                }
                                </ListGroup>
                            </Col>
                        </Row>
                    </div>
                </Row>
            );
        } else if (this.nodes) {
            return (
                <Row className={'justify-content-start'}>
                    <Col xs={12}>
                        
                        <div className="mb-2">
                            Start editing the metapath(s) to be considered in this analysis either by clicking nodes in the dataset schema or by using the buttons below. 
                        </div>

                        <Button outline color="dark" size="sm" onClick={this.toggleEntitySelectionModal.bind(this)}>Select starting entity</Button>
                        {(this.state.entityModalOpen) &&
                        <EntityInsertionModal entities={this.nodes} onSelection={this.props.onNewEntity}
                                              onDismiss={this.toggleEntitySelectionModal.bind(this)} />}
                        <Button className={'ml-2'} outline color="dark" size="sm" onClick={this.togglePredefinedMetapathsModal.bind(this)}>Select a predefined
                            metapath</Button>
                        <Modal isOpen={this.state.predefinedMetapathsModalOpen} toggle={this.togglePredefinedMetapathsModal.bind(this)} className={'modal-lg'}>
                            <ModalHeader toggle={this.togglePredefinedMetapathsModal.bind(this)}>Select a predefined metapath</ModalHeader>
                            <ModalBody>
                                <PredefinedMetapathBrowser dataset={this.props.dataset} handlePredefinedMetapathAddition={metapathEntities=>{
                                    this.setState({
                                        predefinedMetapathsModalOpen: false
                                    }, this.props.handlePredefinedMetapathAddition(metapathEntities));
                                }}/>
                            </ModalBody>
                        </Modal>
                    </Col>
                </Row>
            );
        } else {
            return (
                <Row>
                    <Col>

                    </Col>
                </Row>
            );
        }
    }
}

export default MetapathPanel;
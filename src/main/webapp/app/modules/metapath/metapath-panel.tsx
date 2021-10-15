import React from 'react';
import { Button, Row, Col, Modal, ModalHeader, ModalBody, Spinner } from 'reactstrap';
import EntityBox from './entity-box';
import EntityConnector from './entity-connector';
import EntityInsertionModal from './entity-insertion-modal';
import MetapathControl from './metapath-control';
import Recommendation from 'app/modules/metapath/recommendation';
import PredefinedMetapathBrowser from 'app/modules/metapath/predefined-metapath-browser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { IRootState } from 'app/shared/reducers';
import { connect } from 'react-redux';
import _ from 'lodash';
import { ACTION_TYPES as metapathActions} from 'app/modules/metapath/metapath.reducer';

interface MetapathPanelProps {
    constraints: any,
    dataset: string,
    metapath: any,
    metapathStr: any,
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
    handleSelectFieldChange: any,
    handleMultipleAddition: any,
    handlePredefinedMetapathAddition: any,
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
        this.setState(
            {
                predefinedMetapathsModalOpen: (!this.state.predefinedMetapathsModalOpen)
            }
        )
    }

    isMetapathValid() {
        return this.checkMetapathDefined() && this.checkMetapathLength() && this.checkSymmetricMetapath() && this.checkConstraints();
    }

    generateNotification() {
        if (this.checkMetapathDefined()) {
            if (this.checkMetapathLength()) {
                if (this.checkSymmetricMetapath()) {
                    if (this.checkConstraints()) {
                        return "Valid metapath!";
                    }
                    return" At least one constraint must be defined";
                }
                return "Metapath must be symmetric i.e. start and end with the same entity";
            }
            return "Metapath must contain at least 3 entities";
        }
    }

    checkMetapathDefined() {
        return this.props.metapathStr.length > 0;
    }

    checkMetapathLength() {
        return (this.props.metapathStr.length >= 3);
    }

    checkSymmetricMetapath() {

        let metapath = this.props.metapathStr.slice(0);

        if (metapath.length < 3)
            return false;

        const midPos = Math.floor(metapath.length / 2);

        // if metapath length is even, remove mid character
        if (metapath.length % 2 !== 0) {
            metapath = metapath.slice(0, midPos) + metapath.slice(midPos + 1);
        }

        const firstHalf = metapath.substr(0, midPos);
        const lastHalf = metapath.substr(midPos, metapath.length - 1);
        // console.log("first " + firstHalf);
        // console.log("last " + lastHalf);
        return (firstHalf === this.reverseString(lastHalf));
    }

    reverseString(str) {
        const splitString = str.split('');
        const reverseArray = splitString.reverse();
        const joinArray = reverseArray.join('');
        return joinArray;
    }

    getCrudeInterpretation() {
        if (this.checkSymmetricMetapath()) {
            const targetEntity = this.props.metapath[0].data('label');
            if (this.props.metapath.length === 3) {
                const relatingEntity = this.props.metapath[1].data('label');
                return `Metapath will retrieve ${targetEntity} entities, that are connected with one ${relatingEntity} entity.`;
            } else {
                
                const metapathString = this.props.metapath.map((entity, index) => {
                    return entity.data('label');
                }).join("-");
                return `Metapath will retrieve ${targetEntity} entities, that are connected with the metapath: ${metapathString}.`;
            }
        }
        return <div></div>;
    }

    checkConstraints() {
        if (this.props.analysis === 'simjoin' || this.props.analysis === 'simsearch')
            return true;

        const constraints = {};
        _.forOwn(this.props.constraints, (entityConstraint, entity) => {
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
            return <Spinner />;
        } else if (this.props.metapathInfo && this.props.metapathInfo.metapathDescription) {
            return this.props.metapathInfo.metapathDescription;
        }
        return this.getCrudeInterpretation();
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
                    metapathEntityBoxes.push(<EntityConnector />);
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
                        <EntityBox className='' color="dark" disabled entity={element} constraintsControl={false}
                                   idIndexedSchema={idIndexedSchema}
                                   dataset={null} />
                    );
                }
            });
            return (
                <Row>
                    <div className="align-items-center col-12 d-flex flex-wrap">
                        { metapathEntityBoxes }
                        <MetapathControl schema={this.props.schema} metapath={this.props.metapath}
                                        onNewEntity={this.props.onNewEntity} onDelete={this.props.onDelete} />
                        <Recommendation
                            recommendationEntities={recommendationList}
                            idIndexedSchema={idIndexedSchema}
                            onRecommendationAccept={this.props.onRecommendationAccept} />
                    </div>

                    <div className="align-items-center col-12 d-flex">
                        { 
                            this.isMetapathValid() ?
                                <span className="text-success font-italic">
                                    <FontAwesomeIcon icon={faCheckCircle} title="Metapath is valid!"/> { this.getInterpretation() }
                                </span>
                            : 
                                <span className="text-danger font-italic">
                                    <FontAwesomeIcon icon={faExclamationCircle} /> { this.generateNotification() }
                                </span>
                        }
                    </div>
                </Row>
               
            );
        } else if (this.nodes) {
            return (
                <Row className={'justify-content-start'}>
                    <Col xs={12}>
                        <Button outline color="dark" size="sm" onClick={this.toggleEntitySelectionModal.bind(this)}>Select starting
                            entity</Button>
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

const mapStateToProps = (storeState: IRootState) => ({
    metapathInfo: storeState.metapath.metapathInfo,
    metapathLoading: storeState.metapath.loading
});


const mapDispatchToProps = {
};

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = typeof mapDispatchToProps;

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MetapathPanel);
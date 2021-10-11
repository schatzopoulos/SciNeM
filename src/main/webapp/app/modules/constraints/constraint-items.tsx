import React from 'react';
import {
	Row,
	Col,
	Button,
	ListGroupItem,
} from 'reactstrap';
import ConstraintItemField from './constraint-item-field';
import ConstraintItemDescription from 'app/modules/constraints/constraint-item-description';
import _ from 'lodash';

export interface IConstraintItemProps {
	entity: string;

	dataset: string,
	entityConstraints: any,

	// functions
    handleSwitch: any,
	handleDropdown: any,
	handleLogicDropdown: any,
	handleInput: any,
	handleAddition: any,
	handleRemoval: any,
    handleMultipleAddition: any
}

export class ConstraintItems extends React.Component<IConstraintItemProps> {
    _constraintItemFieldsRefs: any = {};

    constructor(props) {
        super(props);
    }

    save() {
        // save current constraints even if not explicitly saved
        Object.keys(this._constraintItemFieldsRefs).forEach(key => {
            this._constraintItemFieldsRefs[key].handleAddition();
        });
    }

	render() {
        const entity = this.props.entity;
        const dataset = this.props.dataset;

        const constraintItemContents= [];

        _.map(this.props.entityConstraints, (fieldConstraints, field) => {
            const enabled = fieldConstraints['enabled'];
            const numberOfConditions = fieldConstraints.conditions.reduce(
                (conditionsNumber, condition) => (condition.value && condition.index>0) ? conditionsNumber+1 : conditionsNumber, 0
            )
            if (field === 'id') return '';

            return _.map(fieldConstraints['conditions'], (condition, index: number) => {
                return index===0
                    ? <ConstraintItemField
                        ref={(r) => this._constraintItemFieldsRefs[field] = r}
                        key={ `${entity}_${field}_${index}` }
                        data={ condition }
                        dataset= { dataset }
                        entity={ entity }
                        field={ field }
                        type={ fieldConstraints.type }
                        enabled={ enabled }
                        lastFieldCondition={index === fieldConstraints['conditions'].length - 1}
                        numberOfConditions={numberOfConditions}
                        handleSwitch={this.props.handleSwitch.bind(this)}
                        handleDropdown={this.props.handleDropdown.bind(this)}
                        handleLogicDropdown={this.props.handleLogicDropdown.bind(this)}
                        handleAddition={this.props.handleAddition.bind(this)}
                        handleMultipleAddition={this.props.handleMultipleAddition}
                    />
                    : <ConstraintItemDescription
                        entity={entity}
                        field={field}
                        data={condition}
                        enabled={enabled}
                        handleRemoval={this.props.handleRemoval.bind(this)}
                    />
            })
        }).filter(el=>!!el).forEach((element, index)=>{
            if (index!==0) {
                constraintItemContents.push(<hr/>);
            }
            constraintItemContents.push(element);
        })
		return (
			<ListGroupItem md='12' key={ entity }>
				<h5>{ entity }</h5>
                {constraintItemContents}
			</ListGroupItem>
        );
	}
};

export default ConstraintItems;




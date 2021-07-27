import React, { useState } from 'react';

import { Button } from 'reactstrap';
import { faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';


class ConditionFileSelector extends React.Component<any, any> {

    state = {
        fileInputIndex: 0
    };

    handleInputFileChange(e) {
        if (e.target.files) {
            const fileName = e.target.files[0];

            if (fileName) {
                const reader = new FileReader();

                reader.onload = (ev) => {
                    const content = String(reader.result);
                    if (content) {
                        const conditions = JSON.parse(content);
                        this.validateType(conditions);
                    }
                };


                this.setState({ fileInputIndex: this.state.fileInputIndex + 1 }, () => {
                    reader.readAsText(fileName);
                });
            }
        }
    }


    validateNumericConditions = (conditionList) => {
        const values = [];
        conditionList.forEach((condition, index) => {
            if (index !== 0) {
                if (!Object.prototype.hasOwnProperty.call(condition, 'logicOp')) {
                    throw `Undefined logical operation in condition ${index + 1}`;
                } else if (condition.logicOp.toLowerCase() !== 'or' && condition.logicOp.toLowerCase() !== 'and') {
                    throw `Invalid logical operation for numbers, in condition ${index + 1}`;
                }
            }

            if (!Object.prototype.hasOwnProperty.call(condition, 'operation')) {
                throw `Undefined operation in condition ${index + 1}`;
            } else if (condition.operation !== '=' && condition.operation !== '>' && condition.operation !== '<' && condition.operation !== '>=' && condition.operation !== '<=') {
                throw `Invalid operation for numbers, in condition ${index + 1}`;
            }

            if (!Object.prototype.hasOwnProperty.call(condition, 'value')) {
                throw `Undefined value in condition ${index + 1}`;
            } else if (typeof condition.value !== 'number') {
                const value = Number.parseInt(condition.value,10);
                if (isNaN(value)) {
                    throw `Value is not a number, in condition ${index + 1}`;
                } else {
                    values.push(condition.value);
                }
            } else {
                values.push(condition.value);
            }
        });
        this.props.handleMultipleAddition(conditionList);
    };

    validateStringConditions = (conditionList) => {
        const values = [];
        conditionList.forEach((condition, index) => {

            // Validate logic operation for the second and the rest of the arguments
            // First is ignored whether it defines or not a logic operation
            if (index !== 0) {
                if (!Object.prototype.hasOwnProperty.call(condition, 'logicOp')) {
                    throw `Undefined logical operation in condition ${index + 1}`;
                } else if (condition.logicOp.toLowerCase() !== 'or') {
                    throw `Invalid logical operation for strings, in condition ${index + 1}`;
                }
            }

            // Validate operation for all conditions
            if (!Object.prototype.hasOwnProperty.call(condition, 'operation')) {
                throw `Undefined operation in condition ${index + 1}`;
            } else if (condition.operation !== '=') {
                throw `Invalid operation for strings, in condition ${index + 1}`;
            }

            // Validate that the given values are strings
            if (!Object.prototype.hasOwnProperty.call(condition, 'value')) {
                throw `Undefined value in condition ${index + 1}`;
            } else if (typeof condition.value !== 'string') {
                throw `Value is not a string, in condition ${index + 1}`;
            } else {
                values.push(condition.value);
            }
        });

        axios.get('api/datasets/validate', {
            params: {
                folder: this.props.dataset,
                entity: this.props.entity,
                field: this.props.field,
                terms: values.join(',')
            }
        }).then(response => {
            const responseData = response.data;
            if (responseData.result) {
                this.props.handleMultipleAddition(conditionList);
            } else {
                const nonExistentExample = responseData.message;
                const nonExistentString = nonExistentExample.map(ex => {
                    return values.find(val => {
                        return val.toLowerCase() === ex;
                    });
                }).join(', ');
                if (nonExistentExample.length === 1) {
                    alert('A value contained in the conditions file, does not exist:\n\ne.g. ' + nonExistentString);
                } else {
                    alert('Some of the values contained in the conditions file, do not exist:\n\ne.g. ' + nonExistentString);
                }
            }
        }).catch(err => {
            if (err.response) {
                if (err.response.status >= 500) {
                    alert("A server error occurred while attempting to validate the given file conditions.\n\nPlease try again.");
                } else {
                    alert("An error occurred while requesting the validation of the given file's conditions.\n\nPlease refresh your page and try again");
                }
            } else if (err.request) {
                alert("Cannot validate file conditions because validation service is unavailable");
            } else {
                alert("An unknown error occurred while attempting to validate the given file conditions");
            }
        });
    };

    validateType = (list) => {
        if (Array.isArray(list)) {
            try {

                if (this.props.isString) {
                    this.validateStringConditions(list);
                } else {
                    this.validateNumericConditions(list);
                }
            } catch (err) {
                alert(err);
            }
        }
    };

    render() {
        return (
            <div className={'ml-1 d-inline-block'}>
                <input key={this.state.fileInputIndex} type={'file'} id={this.props.id} className={'d-none'}
                       onChange={this.handleInputFileChange.bind(this)} />
                <Button
                    disabled={this.props.disabled}
                    color={'info'}
                    outline
                    size={'sm'}
                    title={'Load conditions from file'}
                    onClick={() => {
                        document.getElementById(this.props.id).click();
                    }}>
                    <FontAwesomeIcon icon={faFileUpload} /> Load from file
                </Button>
            </div>
        );
    }
}

export default ConditionFileSelector;

import React, { useState } from 'react';

const ResultEntry = (props) => {
    const resultFields = props.values.map((value, index) => {
        const RESULTS_MAX_FLOATING_POINT = 6;
        const roundingOperator = Math.pow(10,RESULTS_MAX_FLOATING_POINT);
        const attemptedFloatCast = Number.parseFloat(value);
        return <td key={props.rowIndex + '-' + index}>{(!isNaN(attemptedFloatCast) && attemptedFloatCast%1!==0 && attemptedFloatCast.toString()===value.toString())?Math.round(attemptedFloatCast*roundingOperator)/roundingOperator:value}</td>;
    });

    return (
        <tr key={props.rowIndex} className={props.checked ? 'table-info' : ''}>
            <td>
                <div className={'form-check form-check-inline'}>
                    <input
                        type={'checkbox'}
                        id={`result-checkbox-${props.rowIndex}`}
                        checked={props.checked}
                        className={'form-check-input'}
                        onChange={() => {
                            console.log('ResultEntry: Toggling for index ' + props.rowIndex);
                            props.handleResultSelection([props.rowIndex]);
                        }} />
                    <label className={'form-check-label'} htmlFor={`result-checkbox-${props.rowIndex}`}>{props.showRank?props.rank:''}</label>
                </div>
            </td>
            {resultFields}
        </tr>
    );
};

export default ResultEntry;

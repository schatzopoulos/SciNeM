import React, { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { Collapse } from 'reactstrap';
import ResultsTable from 'app/modules/analysis/results/results-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

import './community-results-entry.css';

const average = (docs, field) => {
    const sum = docs.reduce((totalSum, doc) => {
        const value = Number.parseFloat(doc[field]);
        return totalSum + value;
    },0);
    return sum / docs.length;
};

const CommunityResultsEntry = props => {
    const MAX_COMMUNITY_DESCRIPTION_LENGTH = 64;
    const RESULTS_MAX_FLOATING_POINT = 6;
    const roundingOperator = Math.pow(10,RESULTS_MAX_FLOATING_POINT);
    const communityMembersIndices = _.map(props.docs, doc => doc.resultIndex);
    const wholeCommunitySelected = props.selectedCommunityMembers.length === props.docs.length;
    const [communityCollapsed, toggleCommunity] = useState(true);
    const [focusedSpoilerControl, focusSpoilerControl] = useState(false);
    const communityCheckboxRef = useRef(null);
    const communityDescription = _.chain(props.docs)
        .map(result => result[Array.isArray(props.selectField)?props.selectField[0]:props.selectField])
        .filter(res => !!res)
        .join(', ')
        .truncate({
            length: MAX_COMMUNITY_DESCRIPTION_LENGTH,
            separator: /, +/
        }).value();
    useEffect(() => {
        if (communityCheckboxRef !== null && communityCheckboxRef.current !== undefined) {
            communityCheckboxRef.current.indeterminate = (!wholeCommunitySelected && props.selectedCommunityMembers.length > 0);
        }
    });
    return (
        <>
            <tr key={props.communityId} className={wholeCommunitySelected ? 'table-info' : ''}>
                <td>
                    <input
                        type={'checkbox'}
                        checked={wholeCommunitySelected}
                        ref={communityCheckboxRef}
                        onChange={() => {
                            props.handleToggledCommunityMembers(wholeCommunitySelected ? props.selectedCommunityMembers : _.difference(communityMembersIndices, props.selectedCommunityMembers));
                        }} />
                </td>
                <td>{props.communityId}</td>
                <td>
                    <span>{communityDescription}</span>
                    <span className={'text-secondary'}> <em>({`${props.docs.filter(res=>!!res).length} members`})</em></span>
                </td>
                {props.showAverageOn && props.headers.includes(props.showAverageOn) &&
                <td>
                    {Math.round(average(props.docs, props.showAverageOn)*roundingOperator)/roundingOperator}
                </td>
                }
                <td>
                    <div
                        onClick={() => toggleCommunity(!communityCollapsed)}
                        onMouseEnter={() => focusSpoilerControl(true)}
                        onMouseLeave={() => focusSpoilerControl(false)}
                        className={'spoiler-control' + (communityCollapsed ? '' : ' expanded') + (focusedSpoilerControl ? ' text-info' : '')}
                    ><span><FontAwesomeIcon icon={faCaretDown} /></span>
                    </div>
                </td>
            </tr>
            <tr className={communityCollapsed ? 'hidden-table-row' : 'hidden-table-row expanded'}>
                <td colSpan={(props.showAverageOn && props.headers.includes(props.showAverageOn))?5:4}>
                    <Collapse isOpen={!communityCollapsed}>
                        <ResultsTable
                            docs={props.docs}
                            headers={props.headers}
                            selectField={props.selectField}
                            aliases={props.aliases}
                            communityView={false}
                            innerTable={true}
                            selections={props.selectedCommunityMembers}
                            showRank={props.showRank}
                            handleSelectionChange={toggledCommunityMembers => {
                                props.handleToggledCommunityMembers(_.difference(_.union(toggledCommunityMembers, props.selectedCommunityMembers), _.intersection(toggledCommunityMembers, props.selectedCommunityMembers)));
                            }}
                        />
                    </Collapse>
                </td>
            </tr>
        </>
    );
};


export default CommunityResultsEntry;

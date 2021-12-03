import React, { useRef, useState } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLevelDownAlt } from '@fortawesome/free-solid-svg-icons';

import './community-results-entry.css';

const HierarchicalCommunityResultsEntry = props => {
    const MAX_COMMUNITY_DESCRIPTION_LENGTH = 64;
    const [focusedSpoilerControl, focusSpoilerControl] = useState(false);
    
    const isLeaf = props.doc.community === "leaf" // indicates that we are in leaf level

    let entryData; 
    if (isLeaf) {
        entryData = props.doc.members.map( (member, index) => {

            return <tr key={index}>
                <td></td>
                <td>-</td>
                <td>
                    <span>{ member.name }</span>
                </td>
                {props.showAverageOn && props.headers.includes(props.showAverageOn) &&
                <td>
                    { member["Ranking Score"] }
                </td>
                }
                <td>
                </td>
            </tr>;
        });
    } else {
        const communityDescription = _.chain(props.doc.members)
        .map(e => e.name)
        .join(", ")
        .truncate({
            length: MAX_COMMUNITY_DESCRIPTION_LENGTH,
            separator: /, +/
        }).value();

        entryData = <tr key={props.doc.community}>
                <td></td>
                <td>{ props.doc.community }</td>
                <td>
                    <span>{communityDescription}</span>
                    <span className={'text-secondary'}> <em>({`${props.doc.count} member${props.doc.count === 1 ? '' : 's'}`})</em></span>
                </td>
                {props.showAverageOn && props.headers.includes(props.showAverageOn) &&
                <td>
                    {
                        _.sumBy(props.doc.members, (e) => { return parseFloat(e["Ranking Score"]); }) / props.doc.count
                    }
                </td>
                }
                <td>
                    <a href="" onClick={
                        (e) => {
                            e.preventDefault();
                            props.getHierarchicalResults(props.doc.community);
                        }
                    }><FontAwesomeIcon icon={faLevelDownAlt} title="Level down"/></a>
                </td>
            </tr>;
    }
    return (
        <>
        { entryData }
        </>
    );
};


export default HierarchicalCommunityResultsEntry;

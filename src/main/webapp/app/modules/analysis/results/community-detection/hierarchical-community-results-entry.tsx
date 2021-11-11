import React, { useRef, useState } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLevelDownAlt } from '@fortawesome/free-solid-svg-icons';

import './community-results-entry.css';

const HierarchicalCommunityResultsEntry = props => {
    const MAX_COMMUNITY_DESCRIPTION_LENGTH = 64;
    const [focusedSpoilerControl, focusSpoilerControl] = useState(false);
    
    const isLeaf = props.doc.community === -1; // -1 in community id indicates that we are in leaf level

    

    let entryData; 
    if (isLeaf) {
        entryData = props.doc.members.map( (member) => {
            return <tr key={member}>
                <td></td>
                <td>-</td>
                <td>
                    <span>{ member }</span>
                </td>
                {props.showAverageOn && props.headers.includes(props.showAverageOn) &&
                <td>

                </td>
                }
                <td>
                </td>
            </tr>;
        });
    } else {
        const communityDescription = _.chain(props.doc.members)
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
                </td>
                }
                <td>
                    {/* <div 
                        onClick={
                            () => {
                                props.getHierarchicalResults(props.level, props.doc.community);
                            }
                        }
                        onMouseEnter={() => focusSpoilerControl(true)}
                        onMouseLeave={() => focusSpoilerControl(false)}
                        className={'spoiler-control' + (focusedSpoilerControl ? ' text-info' : '')}
                    > */}
                        <a href="" onClick={
                            (e) => {
                                e.preventDefault();
                                props.getHierarchicalResults(props.level, props.doc.community);
                            }
                        }><FontAwesomeIcon icon={faLevelDownAlt} title="Level down"/></a>
                    {/* </div> */}
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

import './ranking-results.scss';

import React, { useRef } from 'react';
import _ from 'lodash';
import { Table } from 'reactstrap';
import ResultEntry from './result-entry';
import CommunityResultsEntry from 'app/modules/analysis/results/community-results-entry';

export interface IResultsTableProps {
    docs: any,
    headers: any,
    selectField: any,
    communityView: boolean,
    selections: any,
    showRank: boolean
    aliases?:any,
    innerTable?: boolean,

    handleSelectionChange: any
}

export class ResultsTable extends React.Component<IResultsTableProps> {

    tableCheckboxRef = null;
    state = {
        allSelected: false,
        selectedIndices: []
    };

    constructor(props) {
        super(props);
        this.tableCheckboxRef = React.createRef();
    }

    componentDidUpdate(prevProps: Readonly<IResultsTableProps>, prevState: Readonly<{}>, snapshot?: any) {
        if ((prevProps.docs.length < this.props.docs.length) && (this.state.allSelected)) {
            this.setState({
                allSelected: false
            });
        }


        if (this.tableCheckboxRef.current) {
            this.tableCheckboxRef.current.indeterminate = (!(this.props.selections.length === this.props.docs.length) && this.props.selections.length > 0);
        }
    }

    toggleSelected(selections) {
        this.props.handleSelectionChange(_.difference(_.union(selections, this.props.selections), _.intersection(selections, this.props.selections)));
    }

    handleMasterSelectionChange() {
        if (this.props.selections.length === this.props.docs.length) {
            this.props.handleSelectionChange([]);
        } else {
            this.props.handleSelectionChange(_.map(this.props.docs, doc => doc.resultIndex));
        }
    }

    render() {
        let rows;
        const rearrangeHeaders = (headers, selectField) => {
            const selectFieldHeaderIndex = headers.indexOf(selectField);
            if (selectFieldHeaderIndex > -1) {
                return [selectField].concat(headers.slice(0, selectFieldHeaderIndex), headers.slice(selectFieldHeaderIndex + 1));
            }
            return [];
        };
        const tableHeaders = this.props.communityView
            ? this.props.headers.includes('Ranking Score') ? ['Community', 'Members', 'Average Ranking Score'] : ['Community', 'Members']
            : Array.isArray(this.props.selectField)
                ?this.props.selectField.reverse().reduce((newHeaders, currentSelectField)=>{
                    return rearrangeHeaders(newHeaders,currentSelectField);
                },this.props.headers)
                :rearrangeHeaders(this.props.headers, this.props.selectField);

        // const tableHeaders = this.props.communityView? this.props.headers: rearrangeHeaders(this.props.headers,this.props.selectField);
        if (!this.props.communityView) {
            rows = this.props.docs.map((row, index) => {

                const rowValues = tableHeaders.map(fieldName => {
                    return row[fieldName];
                });

                return (
                    <ResultEntry
                        key={'result-' + row.resultIndex}
                        rowIndex={row.resultIndex}
                        rank={index+1}
                        selectField={this.props.selectField}
                        showRank={this.props.showRank}
                        values={rowValues}
                        checked={this.props.selections.includes(row.resultIndex)}
                        handleResultSelection={this.toggleSelected.bind(this)}
                    />
                );
            });
        } else {
            rows = _.map(_.values(_.groupBy(this.props.docs, result => result.Community)), communityGroup => {
                const communityIndices = _.map(communityGroup, member => member.resultIndex);
                return (
                    <CommunityResultsEntry
                        key={communityGroup[0].Community}
                        communityId={communityGroup[0].Community}
                        headers={_.without(this.props.headers, 'Community')}
                        aliases={this.props.aliases}
                        docs={communityGroup}
                        selectField={this.props.selectField}
                        selectedCommunityMembers={_.intersection(this.props.selections, communityIndices)}
                        showAverageOn={'Ranking Score'}
                        showRank={this.props.showRank}
                        handleToggledCommunityMembers={this.toggleSelected.bind(this)}
                    />
                );
            });
        }

        return (
            <Table size="sm">
                <thead>
                <tr className={(!this.props.innerTable && (this.props.selections.length === this.props.docs.length)) ? 'bg-info' : ''}>
                    <th>
                        {!this.props.innerTable &&
                        <div className={'form-check form-check-inline'}>
                            <input
                                type={'checkbox'}
                                id={'results-table'}
                                onChange={this.handleMasterSelectionChange.bind(this)}
                                checked={this.props.selections.length === this.props.docs.length}
                                ref={this.tableCheckboxRef}
                                className={'form-check-input'} />
                            <label className={'form-check-label'}
                                   htmlFor={'results-table'}>{(!this.props.communityView && this.props.showRank)? 'Rank' : ''}</label>
                        </div>
                        }
                        {this.props.innerTable && this.props.showRank &&
                        <span>Rank</span>
                        }
                    </th>
                    {
                        tableHeaders.map((fieldName, index) => {
                            return <th key={`header-${index}-${fieldName}`}>{this.props.aliases?_.get(this.props.aliases,fieldName,fieldName):fieldName}</th>;
                        })
                    }
                    {
                        this.props.communityView &&
                        <th></th>
                    }
                </tr>
                </thead>
                <tbody>
                {rows}
                </tbody>
            </Table>
        );
    }
};

export default ResultsTable;




import React, { useEffect, useState } from 'react';
import {
    Button,
    Row,
    Col,
    Spinner,
    Table
} from 'reactstrap';
import { IRootState } from 'app/shared/reducers';
import { connect } from 'react-redux';
import { getPredefinedMetapaths } from 'app/modules/metapath/metapath.reducer';

const PredefinedMetapathBrowser = props => {
    const predefinedMetapathsComponents = props.predefinedMetapaths
        ? props.predefinedMetapaths.sort((pm0,pm1)=>pm0.stats.rank-pm1.stats.rank).map(
            predefinedMetapathData => {
                return (
                    <tr key={`metapath-${predefinedMetapathData.metapathAbbreviation}`}>
                        <td>{predefinedMetapathData.metapathAbbreviation}</td>
                        <td>{predefinedMetapathData.description || 'N/A'}</td>
                        <td>{predefinedMetapathData.timesUsed}</td>
                        <td><Button color={'success'} onClick={() => {
                            props.handlePredefinedMetapathAddition(predefinedMetapathData.metapath);
                        }}>Select</Button></td>
                    </tr>
                );
            }
        )
        : [];
    useEffect(() => {
        props.getPredefinedMetapaths(props.dataset);
    }, [props.dataset]);
    return (
        <Row className={'mt-2'}>
            <Col xs={12} className={props.loading ? 'text-center' : ''}>
                {props.loading
                    ? <Spinner color={'dark'} />
                    : props.error
                        ? <div className={'text-danger'}>{props.error}</div>
                        : props.success
                            ? predefinedMetapathsComponents.length > 0
                                ? <Table borderless>
                                    <thead>
                                    <tr>
                                        <th>Metapath</th>
                                        <th>Description</th>
                                        <th>Times used</th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {predefinedMetapathsComponents}
                                    </tbody>
                                </Table>
                                : <div className={'text-secondary'}>No metapaths predefined for
                                    dataset {props.dataset}</div>
                            : <div></div>
                }
            </Col>
        </Row>
    );
};

const mapStateToProps = (storeState: IRootState) => ({
    loading: storeState.metapath.loading,
    error: storeState.metapath.error,
    success: storeState.metapath.success,
    predefinedMetapaths: storeState.metapath.predefinedMetapaths
});

const mapDispatchToProps = {
    getPredefinedMetapaths
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PredefinedMetapathBrowser);

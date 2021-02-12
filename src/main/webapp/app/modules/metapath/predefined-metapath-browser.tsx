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
    const handleMetapathApplication = newMetapathString => {
        const newMetapathCharacters = [...newMetapathString];
        const cytoscapeMetapath = newMetapathCharacters.map(c => props.cytoscapeIds.find(mapping => mapping[0] === c)[1]);
        props.clearMetapath();
        props.applyMetapath(cytoscapeMetapath);
    };
    const predefinedMetapathsComponents = props.predefinedMetapaths
        ? props.predefinedMetapaths.map(
            predefinedMetapathData => {
                const metapathString = (predefinedMetapathData.metapath.map(entity => entity[0])).join('');
                return (
                    <tr key={`metapath-${metapathString}`}>
                        <td>{metapathString}</td>
                        <td>{predefinedMetapathData.description}</td>
                        <td><Button color={'success'} onClick={() => {
                            handleMetapathApplication(predefinedMetapathData.metapath);
                        }}>Apply</Button></td>
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

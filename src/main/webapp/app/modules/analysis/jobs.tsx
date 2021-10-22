import React from 'react';
import { connect } from 'react-redux';
import { Button, Card, Col, Container, Input, Progress, Row } from 'reactstrap';
import { IRootState } from 'app/shared/reducers';
import _ from 'lodash';
import { getJob, getMoreResults, getResults, getStatus } from './jobs.reducer';
import ResultsPanel from './results/results';
import { Spinner } from 'reactstrap';

export interface IHomeProps extends StateProps, DispatchProps {
    loading: boolean;
    progress: number;
    progressMsg: string;
    error: string;
    docs: any;
    meta: any;
    uuid: string;
};

export class Jobs extends React.Component<IHomeProps> {
    readonly state: any = {
        jobId: ''
    };
    polling: any;

    pollForResults() {
        this.polling = setInterval(() => {
            this.props.getStatus(this.props.uuid);
        }, 1000);
    }

    componentDidMount() {
        if (this.props['match']['params']['jobId']) {
            this.setState({
                jobId: this.props['match']['params']['jobId']
            }, () => {
                this.props.getJob(this.state.jobId);
            });
        }
    }

    componentDidUpdate(prevProps) {

        // new uuid detected, start polling
        if (this.props.loading && !prevProps.loading) {
            this.pollForResults();
        } else if (prevProps.loading && !this.props.loading) {
            clearInterval(this.polling);
        }

        _.forOwn(this.props.status, (completed, analysis) => {
            if ((completed && ((prevProps.status && !prevProps.status[analysis]) || (!prevProps.status))) && !this.props.progressMsg.startsWith('Warning')) {
                this.props.getResults(analysis, this.props.uuid);
            }
        });
    }

    componentWillUnmount() {
        clearInterval(this.polling);
    }

    execute(e) {
        e.preventDefault();
        this.props.getJob(this.state.jobId);
    }

    loadMoreResults(analysis, nextPage) {
        this.props.getMoreResults(analysis, this.props.uuid, nextPage);
    }

    onChangeInput(e) {
        const jobId = e.target.value;
        this.setState({
            jobId
        });
    }

    render() {

        return (
            <Container fluid>
                <Row>
                    <Col md="6">
                        <Row>
                            <Col>
                               <h4>Re-attach to analysis</h4>
                                <Row>
                                    <Col md='10'>
                                        <Input name="job_id" id="job_id" placeholder="Please give a valid analysis id"
                                               onChange={this.onChangeInput.bind(this)} value={this.state.jobId} />
                                    </Col>
                                    <Col md='2'>
                                        <Button color="success" disabled={this.props.loading || this.state.jobId === ''}
                                                onClick={this.execute.bind(this)}>
                                            {/* <FontAwesomeIcon icon="search" />  */}
                                            Search
                                        </Button>
                                    </Col>
                                    &nbsp;

                                </Row>
                            </Col>
                        </Row>

                    </Col>

                    <Col md='12'>
                        <Container>
                            {(this.props.error || this.props.description || this.props.loading) &&
                            <Card className={'my-4 pt-0'}>
                                <Row className={'justify-content-end'}>
                                    <h5 className={'p-2'}><strong className={'text-muted'}>Analysis
                                        ID: {this.props.uuid}</strong></h5>
                                </Row>
                                <br />
                                {
                                    (this.props.error) &&
                                    <Row>
                                        <Col md={{ size: 6, offset: 3 }}>
                                            {this.props.error}
                                        </Col>
                                    </Row>
                                }
                                <br />
                                {
                                    ((this.props.description || '').startsWith('Warning')) &&
                                    <Row className="small-red text-center">
                                        <Col>
                                            {this.props.description}
                                        </Col>
                                    </Row>
                                }
                                {
                                    (this.props.loading) &&
                                    <Row className="small-grey text-center">
                                        <Col>
                                            {!_.isEmpty(this.props.description)
                                                ? this.props.description
                                                : <span>
                                                    <Spinner size='sm' cllassName="small-grey"/> Loading analysis description...
                                                </span>
                                            }
                                            {/* {this.props.progress && this.props.progress<100?<Button size={'sm'} className={'badge btn-danger'}><FontAwesomeIcon icon={faTimes}/> Cancel analysis</Button>:''} */}
                                        </Col>
                                    </Row>
                                }
                                {
                                    (this.props.loading) && 
                                    <Progress animated color="info" value={this.props.progress}>{this.props.progressMsg}</Progress>
                                }
                                <ResultsPanel
                                    uuid={this.props.uuid}
                                    description={this.props.description}
                                    results={this.props.results}
                                    analysis={this.props.analysis}
                                    analysisId={this.props.uuid}
                                    loadMore={this.loadMoreResults.bind(this)}
                                    rerun={this.execute.bind(this)}
                                />
                            </Card>
                            }
                        </Container>
                    </Col>
                </Row>
            </Container>
        );
    }
};

const mapStateToProps = (storeState: IRootState) => ({
    loading: storeState.jobs.loading,
    progress: storeState.jobs.progress,
    progressMsg: storeState.jobs.progressMsg,
    description: storeState.jobs.description,
    error: storeState.jobs.error,
    results: storeState.jobs.results,
    status: storeState.jobs.status,
    uuid: storeState.jobs.uuid,
    analysis: storeState.jobs.analysis
});

const mapDispatchToProps = {
    getJob,
    getStatus,
    getResults,
    getMoreResults
};

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = typeof mapDispatchToProps;

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Jobs);




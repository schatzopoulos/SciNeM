import React from 'react';
import { 
	Row,
	Col,
	Table,
	Button,
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import RankingResultsPanel from './ranking-results';
import SimResultsPanel from './sim-results';
import axios from 'axios';
import FileSaver from 'file-saver';

export interface IResultsPanelProps {
    docs: any,
    meta: any,
    analysis: string,
    analysisId: string,
    loadMore: any,
    rerun: any,
}

export class ResultsPanel extends React.Component<IResultsPanelProps> {

	constructor(props) {
        super(props);
	}
    downloadResults() {
        axios.get('api/datasets/download', {
            params: {
                analysisType: this.props.analysis,
                id: this.props.analysisId,
            },
            responseType: 'blob',
        }).then( response => FileSaver.saveAs(response.data, "results.csv"));
    }
    tryAgain() {
        this.props.rerun(null, this.props.analysis);
    }
	render() {
        let resultPanel;

        if (this.props.docs) {

            if (this.props.docs.length === 0) {
                return <div style={{ textAlign: "center" }}>No results found for the specified query!<br/> 
                {
                    (this.props.analysis === 'simjoin' || this.props.analysis === 'simsearch') &&
                    <span>
                        Please try again with more loose analysis parameters. <br/>
                        <Button onClick={this.tryAgain.bind(this)} color='success' size='sm'><FontAwesomeIcon icon="play" />  Try again</Button>
                    </span>
                }
                </div>;

            }

            // if (this.props.analysis === 'ranking') {
            resultPanel = <RankingResultsPanel 
                docs={this.props.docs} 
                headers={this.props.meta.headers}
                hasMore={this.props.meta.links.hasNext} 
                loadMore={this.props.loadMore.bind(this)}
            />;
            // } else {
            //     resultPanel = <SimResultsPanel 
            //         docs={this.props.docs} 
            //         hasMore={this.props.meta.links.hasNext} 
            //         loadMore={this.props.loadMore.bind(this)}
            //     />;
            // }
            return (<div>
                <Row>
                    <Col md='10'>
                    <h2>Results</h2>
                    </Col>
                    <Col md='2' style={{textAlign: 'right'}}>
                        <Button color="info" outline onClick={this.downloadResults.bind(this)}><FontAwesomeIcon icon="download" /> Download</Button>
                    </Col>
                </Row>
                
                <div className="small-grey">
                    Displaying {this.props.docs.length} out of {this.props.meta.totalRecords} results
                </div>
                <br/>
                { resultPanel }
            </div>);

        } 
        return '';
		
	}
};

export default ResultsPanel;




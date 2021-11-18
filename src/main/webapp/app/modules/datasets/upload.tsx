import './upload.scss';

import React from 'react';
import { connect } from 'react-redux';
import { 
	Row, 
	Col, 
	FormGroup, 
	FormText, 
	Input, 
	Button, 
	Label,
	Form,
	Container,
	Alert,
	Spinner,
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IRootState } from 'app/shared/reducers';
import  _  from 'lodash';
import { 
	uploadDataset
} from './datasets.reducer';
import { __metadata } from 'tslib';
import { Link } from 'react-router-dom';

export interface IUploadProps extends StateProps, DispatchProps {};

export class Upload extends React.Component<IUploadProps> {
	readonly state: any = { 
		datasetName: '',
		datasetDataFile: '',
	};

	submit(e) {
		e.preventDefault();
		if (!this.state['datasetDataFile']) {
			alert("Please select a zip file to upload")
			return;
		}
		this.props.uploadDataset(this.state['datasetDataFile']);        
    }
	onChange(e) {
        const newState = {};
        newState[e.target.name] = e.target.files[0];
        this.setState(newState);
    }
	render() {

		return (
			<Container>
			    <Row>
				    <Col md="12">
				    	<h4>Upload Dataset</h4>
                        <Form>
                            {/* <FormGroup>
                                <Label for="exampleEmail">Name</Label>
                                <Input name="datasetName" id="datasetName" placeholder="Dataset Name" required={true} onChange={this.onChange.bind(this)} />
                            </FormGroup> */}
                            <FormGroup>
                                <Label for="data">Data Files (.zip)</Label>
                                <Input type="file" name="datasetDataFile" id="datasetDataFile" accept="zip,application/zip" required={true} onChange={this.onChange.bind(this)} />
                                <FormText color="muted">
                                Please refer [here] for the format of the data files.
                                </FormText>
                            </FormGroup>

                            <Button disabled={this.props.loading} onClick={this.submit.bind(this)}>
								<FontAwesomeIcon icon="upload" /> Upload
							</Button>
                        </Form>
					</Col>
                </Row>
				<br/>
				{
					(this.props.loading) &&       
					<Row>
						<Col>	
							<Spinner type="grow" color="info" />
							<Spinner type="grow" color="info" />
							<Spinner type="grow" color="info" />
							<Spinner type="grow" color="info" />
							<Spinner type="grow" color="info" />
						</Col>
					</Row>
				}
				{
					(this.props.success) && 
					<Row>
						<Col>
							<Alert color="success">
								Your dataset was successfully uploaded!
								Please navigate to <Link to="/" className="alert-link">homepage</Link> to resume your analysis.
							</Alert>
						</Col>
					</Row>
				}
				{
					(this.props.error) && 
					<Row>
						<Col>
							<Alert color="danger">
								{this.props.error}
							</Alert>
						</Col>
					</Row>
				}
				<hr/>
				<h4>Upload File Format</h4>
				Uploading a HIN requires a single compressed (zip) file containing the following files:
				<ul className="upload-list">
					<li>
						<h5>Schema file</h5>
						A schema file that describes the entity types and the relationships between them.
						This should follow the <a href="https://js.cytoscape.org/#notation/elements-json" target="_blank" rel="noopener noreferrer">Cytoscape&apos;s JSON Elements format</a>
					</li>
					<li>
						<h5>Node attribute files</h5>
						These files should be placed inside a folder called <code>nodes</code>;
						they are tab-separated files containing all node attributes. 
						The first line is the header that contains all attribute names. 
						The first column is an incremental integer identifier starting from 0, denoted as <code>id</code> in the header. 
						Node attribute files should be named with the first letter of the entity they are representing. 
						For example, the file that contains the attributes for node type <code>Author</code> should be named <code>A.csv</code>. 
						Below is an example of a file containing node attributes:<br/>				
						<pre>
							<code className="codeblock">
								id	name    surname<br/>
								0	Makoto  Satoh<br/>
								1	Ryo Muramatsu<br/>
							...
							</code>
						</pre>
					</li>
					<li>
						<h5>Relation files</h5>
						These files should be placed inside a folder called <code>relations</code>.
						They are tab-separated files needed to construct the relations among nodes. 
						These are <code>csv</code> files that contain two columns, the source and target numeric identidiers, denoted by <code>src</code> and <code>dst</code> headers.
						They should be named according to the source and target node types. 
						For example, the file with the relations between node types <code>Author</code> and <code>Paper</code> should be named <code>AP.csv</code>. 
						Below are the first lines of a file containing relations:<br/>
						<pre>
							<code>
								src	dst<br/>
								0	1<br/>
								0	2<br/>
								0	3<br/>
								0	5<br/>
								1	0<br/>
								...<br/>
							</code>
						</pre>
					</li>
				</ul>

				

			A sample compressed file that contains all the required files for a subset of the DBLP dataset can be found <a href="http://scinem.imsi.athenarc.gr/content/DBLP_sample.zip" target="_blank" rel="noopener noreferrer">here</a>.	
				

			</Container>
		);
	}
};

const mapStateToProps = (storeState: IRootState) => ({  
	loading: storeState.datasets.loading,
	error: storeState.datasets.error,
	success: storeState.datasets.success,
});

const mapDispatchToProps = { 
	uploadDataset, 
};

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = typeof mapDispatchToProps;

export default connect(
	mapStateToProps,
	mapDispatchToProps,
)(Upload);




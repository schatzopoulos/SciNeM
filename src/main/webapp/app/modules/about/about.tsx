import './about.scss';

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
	Card,
    CardText,
    CardTitle
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IRootState } from 'app/shared/reducers';
import  _  from 'lodash';
import { __metadata } from 'tslib';
import { Link } from 'react-router-dom';
import { faEnvelope, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

export class About extends React.Component {
	render() {

		return (
			<Container>
			    <Row>
				    <Col md="12">
				    	<h4>About SciNeM</h4>

                        <h5 className='text-info'>What is SciNeM ?</h5>
                        <p className='text-justify'><i>SciNeM</i> is an <a href="https://github.com/smartdatalake/Scinem" rel="noopener noreferrer" target="_blank">open-source</a> data science tool for <i>metapath-based querying and analysis of Heterogeneous Information Networks (HINs)</i>. 
                        It currently supports the following operations, given a set of user-specified metapaths:<br/>
                        <ul>
                            <li>ranking entities using a random walk mode</li>    
                            <li>retrieving the most similar pairs of entities</li>
                            <li>finding the most similar entities to a query entity</li>
                            <li>discovering entity communities via several community detection algorithms <a href="https://github.com/smartdatalake/SciNeM-workflows/tree/master/community" rel="noopener noreferrer" target="_blank"><small>[more]</small></a></li>
                        </ul>
                        All supported operations have been implemented in a scalable manner, utilising Apache Spark for scaling out through parallel and distributed computation. 
                        SciNeM has a modular architecture making it easy to extend it with additional algorithms and functionalities. 
                        Moreover, it provides a <a href="http://scinem.imsi.athenarc.gr/swagger-ui/index.html" rel="noopener noreferrer" target="_blank">public REST API</a> that can be used to programmatically submit analyses and retrieve their corresponding results.

                        </p>
                        
                        <Card body outline color="info">
                            <CardTitle tag="h5" className="text-info">How to cite</CardTitle>
                            <CardText>
                                S. Chatzopoulos, T. Vergoulis, P. Deligiannis, D. Skoutas, T. Dalamagas, C. Tryfonopoulos: <span style={{'fontWeight': 'bold'}}>SciNeM: A Scalable Data Science Tool for Heterogeneous Network Mining.</span> <i>In Proc. of the 24<sup>th</sup> International Conference on Extending Database Technology (EDBT)</i> 2021 <a href={'https://edbt2021proceedings.github.io/docs/p168.pdf'} target={'_blank'}><FontAwesomeIcon icon={faExternalLinkAlt} /></a>
                            </CardText>
                            <hr style={{ backgroundColor: '#5bc0de'}} />
                            <small>We kindly ask that any published research that refers to SciNeM cites the paper above.</small>
                        </Card>
                        <br/>
                        <h5 className='text-info'>Team</h5>
                        <div className="list-wrapper">

                            <div className="red-line"></div>
                            
                            <div className="list-item-wrapper">
                                <div className="list-bullet">S</div>
                                <div className="list-item">
                                    <div className="list-title text-info"><a href={'https://schatzopoulos.github.io/'} target={'_blank'}>Serafeim Chatzopoulos <FontAwesomeIcon icon={faExternalLinkAlt} /></a></div>
                                    <div className="list-text small-grey">PhD candidate @ Dept. of Informatics & Tel/tions, Univ. of the Peloponnese</div>
                                </div>
                            </div>
                            
                            <div className="list-item-wrapper">
                                <div className="list-bullet">c</div>
                                <div className="list-item">
                                    <div className="list-title"><a href={'http://thanasis-vergoulis.com/'} target={'_blank'}>Thanasis Vergoulis <FontAwesomeIcon icon={faExternalLinkAlt} /></a></div>
                                    <div className="list-text small-grey">Post-doctoral researcher @ ATHENA Research Center </div>
                                </div>
                            </div>
                            
                            <div className="list-item-wrapper">
                                <div className="list-bullet">i</div>
                                <div className="list-item">
                                    <div className="list-title"><a href={'https://gr.linkedin.com/in/panagiotis-deligiannis-8b2885203'} target={'_blank'}>Panagiotis Deligiannis <FontAwesomeIcon icon={faExternalLinkAlt} /></a></div>
                                    <div className="list-text small-grey">Software developer @ ATHENA Research Center </div>
                                </div>
                            </div>

                            <div className="list-item-wrapper">
                                <div className="list-bullet">N</div>
                                <div className="list-item">
                                    <div className="list-title"><a href={'https://web.imsi.athenarc.gr/~dskoutas/'} target={'_blank'}>Dimitrios Skoutas <FontAwesomeIcon icon={faExternalLinkAlt} /></a></div>
                                    <div className="list-text small-grey">Researcher @ ATHENA Research Center </div>
                                </div>
                            </div>

                            <div className="list-item-wrapper">
                                <div className="list-bullet">e</div>
                                <div className="list-item">
                                    <div className="list-title"><a href={'http://users.uop.gr/~trifon/'} target={'_blank'}>Christos Tryfonopoulos <FontAwesomeIcon icon={faExternalLinkAlt} /></a></div>
                                    <div className="list-text small-grey">Associate Prof. @ Dept. of Informatics & Tel/tions, Univ. of the Peloponnese</div>
                                </div>
                            </div>

                            <div className="list-item-wrapper">
                                <div className="list-bullet">M</div>
                                <div className="list-item">
                                    <div className="list-title"><a href={'https://www.imsi.athenarc.gr/en/people/member/4'} target={'_blank'}>Theodore Dalamagas <FontAwesomeIcon icon={faExternalLinkAlt} /></a></div>
                                    <div className="list-text small-grey">Senior Researcher @ ATHENA Research Center </div>
                                </div>
                                <div className="white-line"></div>
                            </div>
                            
                        </div>
                        <br/>
                        <h5 className='text-info'>Contact us</h5>
                        Please send your feedback at:<br/>
                        <FontAwesomeIcon icon={faEnvelope} size='lg' className="text-info" /> schatz[at]athenarc.gr
                    </Col>
                </Row>
            </Container>
        )
    }
}

export default About;




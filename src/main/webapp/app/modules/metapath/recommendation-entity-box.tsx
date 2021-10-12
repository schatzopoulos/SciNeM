import React from 'react';
import { Button, Col } from 'reactstrap';

import './recommendation-entity-box.css';

const RecommendationEntityBox = (props) => {
    if (props.emphasize) {
        return (
            <Col xs={'auto'} className={'px-0 d-flex align-items-center'}>
                <Button className="text-nowrap emphasized" onClick={props.onClick}
                        onMouseEnter={props.onMouseEnter} onMouseOut={props.onMouseOut}>{props.entity}</Button>
            </Col>
        );
    } else {
        return (
            <Col xs={'auto'} className={'px-0 d-flex align-items-center'}>
                <Button className="text-nowrap" disabled
                        onMouseEnter={props.onMouseEnter} onMouseOut={props.onMouseOut}>{props.entity}</Button>
            </Col>
        );
    }
};

export default RecommendationEntityBox;

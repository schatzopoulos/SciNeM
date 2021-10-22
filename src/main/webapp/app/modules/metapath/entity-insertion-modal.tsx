import React, { useState } from 'react';

import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';

const EntityInsertionModal = (props) => {
    const availableEntities = [];
    const [modal, setModal] = useState(true)
    const closeModal = () => {
        setModal(false);
        props.onDismiss()
    }
    props.entities.forEach(item => {
        availableEntities.push(<Button key={item.label} color="dark" onClick={() => {
            closeModal();
            props.onSelection(item.id);
        }} block>{item.label}</Button>);
    })

    return (
        <Modal isOpen={modal} toggle={closeModal}>
            <ModalHeader toggle={closeModal}>Select a new entity to add</ModalHeader>
            <ModalBody>
                { availableEntities }
            </ModalBody>
        </Modal>
    )
}

export default EntityInsertionModal;
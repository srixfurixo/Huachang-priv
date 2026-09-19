import React, { useState } from 'react';
import { Modal, Steps, message } from 'antd';
import CreateOrderStep from './CreateOrderStep';
import MaterialAllocationStep from './MaterialAllocationStep';

function ProductionPlanWizardModal({ open, onClose, selectedLine, onSuccess }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [createdOrder, setCreatedOrder] = useState(null);

    function handleClose() {
        setCurrentStep(0);
        setCreatedOrder(null);
        onClose();
    }

    function handleOrderCreated(orderData) {
        setCreatedOrder(orderData);
        setCurrentStep(1);
    }

    function handleAllocationComplete() {
        message.success('Production order created and submitted for approval!');
        handleClose();
        if (onSuccess) onSuccess();
    }

    return (
        <Modal
            title={`Plan Production — ${selectedLine?.so_number || ''}`}
            open={open}
            onCancel={handleClose}
            footer={null}
            width={850}
            destroyOnClose
        >
            <Steps
                current={currentStep}
                style={{ marginBottom: 24, marginTop: 12 }}
                items={[
                    { title: '1. Order Details & Scheduling' },
                    { title: '2. Material Allocation' }
                ]}
            />

            {currentStep === 0 && (
                <CreateOrderStep
                    selectedLine={selectedLine}
                    onNext={handleOrderCreated}
                    onCancel={handleClose}
                />
            )}

            {currentStep === 1 && (
                <MaterialAllocationStep
                    createdOrder={createdOrder}
                    onComplete={handleAllocationComplete}
                    onCancel={handleClose}
                />
            )}
        </Modal>
    );
}

export default ProductionPlanWizardModal;

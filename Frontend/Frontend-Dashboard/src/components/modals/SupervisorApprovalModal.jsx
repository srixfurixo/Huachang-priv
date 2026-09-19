import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Table, Input, Button, Space, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

function SupervisorApprovalModal({ open, onClose, orderId, onSuccess }) {
    const [orderDetails, setOrderDetails] = useState(null);
    const [allocations, setAllocations] = useState([]);
    const [remarks, setRemarks] = useState('');

    useEffect(function () {
        if (!open || !orderId) {
            setOrderDetails(null);
            setAllocations([]);
            setRemarks('');
            return;
        }

        axios.get(`/api/production/orders/${orderId}`)
            .then(function (res) {
                if (res.data?.success) {
                    setOrderDetails(res.data.production_order);
                    setAllocations(res.data.material_allocations || []);
                }
            })
            .catch(function () {
                message.error('Failed to load order details.');
            });
    }, [open, orderId]);

    function handleApprove() {
        axios.patch(`/api/production/supervisor/orders/${orderId}/approve-slot`)
            .then(function (res) {
                if (res.data?.success) {
                    message.success('Production slot approved successfully.');
                    if (onSuccess) onSuccess();
                    onClose();
                }
            })
            .catch(function (err) {
                message.error(err.response?.data?.error || 'Failed to approve slot.');
            });
    }

    function handleReject() {
        if (!remarks.trim()) {
            return message.warning('Please provide remarks to reject the slot.');
        }

        axios.patch(`/api/production/supervisor/orders/${orderId}/reject-slot`, { supervisor_remarks: remarks })
            .then(function (res) {
                if (res.data?.success) {
                    message.success('Production slot rejected and reverted to draft.');
                    if (onSuccess) onSuccess();
                    onClose();
                }
            })
            .catch(function (err) {
                message.error(err.response?.data?.error || 'Failed to reject slot.');
            });
    }

    const materialColumns = [
        {
            title: 'Raw Item Code',
            dataIndex: 'raw_item_code',
            key: 'raw_item_code',
            render: function (t) { return <b>{t}</b>; }
        },
        {
            title: 'Description',
            dataIndex: 'raw_item_description',
            key: 'raw_item_description'
        },
        {
            title: 'Source Type',
            dataIndex: 'source_type',
            key: 'source_type'
        },
        {
            title: 'Source / Batch Ref',
            dataIndex: 'source_ref',
            key: 'source_ref'
        },
        {
            title: 'Allocated (MT)',
            dataIndex: 'allocated_qty_mt',
            key: 'allocated_qty_mt',
            render: function (v) { return `${Number(v || 0).toFixed(2)} MT`; }
        }
    ];

    return (
        <Modal
            title={`Review Production Order — ${orderDetails?.production_order_code || ''}`}
            open={open}
            onCancel={onClose}
            width={800}
            footer={null}
            destroyOnClose
        >
            {orderDetails && (
                <Space direction="vertical" size="middle" orientation="vertical" orientationMargin={0} orientationType="flex" orientationPlacement="vertical" style={{ width: '100%' }}>
                    <Descriptions bordered size="small" column={2}>
                        <Descriptions.Item label="SO Number">{orderDetails.so_number || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Customer">{orderDetails.customer_name || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Product">{orderDetails.item_code} - {orderDetails.item_description || ''}</Descriptions.Item>
                        <Descriptions.Item label="Handling Type">{orderDetails.handling_type}</Descriptions.Item>
                        <Descriptions.Item label="Target Qty">{Number(orderDetails.target_qty_mt || 0).toFixed(2)} MT</Descriptions.Item>
                        <Descriptions.Item label="Packaging">{orderDetails.target_packaging} ({orderDetails.target_unit_count} bags)</Descriptions.Item>
                        <Descriptions.Item label="Scheduled Date">
                            {orderDetails.scheduled_start_date ? dayjs(orderDetails.scheduled_start_date).format('YYYY-MM-DD') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Shift">{orderDetails.scheduled_shift || 'Morning'}</Descriptions.Item>
                        <Descriptions.Item label="Recipe Instructions" span={2}>
                            {orderDetails.recipe_instructions || 'None'}
                        </Descriptions.Item>
                    </Descriptions>

                    <div>
                        <b style={{ display: 'block', marginBottom: 8 }}>Allocated Raw Materials:</b>
                        <Table
                            size="small"
                            rowKey="id"
                            columns={materialColumns}
                            dataSource={allocations}
                            pagination={false}
                        />
                    </div>

                    <div>
                        <b style={{ display: 'block', marginBottom: 8 }}>Supervisor Remarks:</b>
                        <Input.TextArea
                            rows={3}
                            placeholder="Enter revision notes if rejecting, or optional approval remarks..."
                            value={remarks}
                            onChange={function (e) { setRemarks(e.target.value); }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Space>
                            <Button onClick={onClose}>
                                Cancel
                            </Button>
                            <Button danger onClick={handleReject}>
                                Reject Slot
                            </Button>
                            <Button type="primary" onClick={handleApprove}>
                                Approve Slot
                            </Button>
                        </Space>
                    </div>
                </Space>
            )}
        </Modal>
    );
}

export default SupervisorApprovalModal;
import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import SupervisorApprovalModal from '../../../components/modals/SupervisorApprovalModal';

function SupervisorApprovalsView() {
    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    function fetchPendingOrders() {
        axios.get('/api/production/supervisor/pending-approval')
            .then(function (res) {
                if (res.data?.success) {
                    setOrders(res.data.pending_orders || []);
                }
            })
            .catch(function () {
                message.error('Failed to load pending approval orders.');
            });
    }

    useEffect(function () {
        fetchPendingOrders();
    }, []);

    function openReview(id) {
        setSelectedOrderId(id);
        setModalOpen(true);
    }

    const columns = [
        {
            title: 'Production Code',
            dataIndex: 'production_order_code',
            key: 'production_order_code',
            render: function (t) { return <b>{t}</b>; }
        },
        {
            title: 'SO Number',
            dataIndex: 'so_number',
            key: 'so_number',
            render: function (t) { return <b style={{ color: '#10b981' }}>{t}</b>; }
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name'
        },
        {
            title: 'Product',
            key: 'product',
            render: function (_, r) { return `${r.item_code} - ${r.item_description || ''}`; }
        },
        {
            title: 'Target Qty',
            dataIndex: 'target_qty_mt',
            key: 'target_qty_mt',
            render: function (qty) { return `${Number(qty || 0).toFixed(2)} MT`; }
        },
        {
            title: 'Shift',
            dataIndex: 'scheduled_shift',
            key: 'scheduled_shift',
            render: function (s) { return <Tag color="gold">{s || 'Morning'}</Tag>; }
        },
        {
            title: 'Scheduled Date',
            dataIndex: 'scheduled_start_date',
            key: 'scheduled_start_date',
            render: function (d) { return d ? dayjs(d).format('YYYY-MM-DD') : '-'; }
        },
        {
            title: 'Action',
            key: 'action',
            render: function (_, record) {
                return (
                    <Button type="primary" size="small" onClick={function () { openReview(record.id); }}>
                        Review & Approve
                    </Button>
                );
            }
        }
    ];

    return (
        <div>
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                pagination={{ pageSize: 10 }}
            />

            <SupervisorApprovalModal
                open={modalOpen}
                orderId={selectedOrderId}
                onClose={function () {
                    setModalOpen(false);
                    setSelectedOrderId(null);
                }}
                onSuccess={fetchPendingOrders}
            />
        </div>
    );
}

export default SupervisorApprovalsView;
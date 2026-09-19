import React, { useState, useEffect } from 'react';
import { Table, Tag, Select, Space, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import PDOAssignWorkerModal from '../../../components/modals/ProductionOrderDetailModal';

function ProductionHubOrdersView() {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPdo, setSelectedPdo] = useState(null);

    function fetchOrders() {
        setLoading(true);
        const url = statusFilter 
            ? `/api/production/orders?status=${statusFilter}` 
            : '/api/production/orders';

        axios.get(url)
            .then(function (res) {
                if (res.data?.success) {
                    setOrders(res.data.production_orders || []);
                }
            })
            .catch(function () {
                message.error('Failed to load production orders.');
            })
            .finally(function () {
                setLoading(false);
            });
    }

    useEffect(function () {
        fetchOrders();
    }, [statusFilter]);

    function getStatusTag(status) {
        const colors = {
            'Draft': 'default',
            'Pending_Supervisor_Approval': 'orange',
            'Approved': 'blue',
            'In_Progress': 'cyan',
            'Completed': 'green',
            'Cancelled': 'red'
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace(/_/g, ' ')}</Tag>;
    }

    const columns = [
        {
            title: 'Production Code',
            dataIndex: 'production_order_code',
            key: 'production_order_code',
            render: function (text) {
                return <b>{text}</b>;
            }
        },
        {
            title: 'SO Number',
            dataIndex: 'so_number',
            key: 'so_number',
            render: function (text) {
                return <b style={{ color: '#10b981' }}>{text}</b>;
            }
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name'
        },
        {
            title: 'Product',
            key: 'product',
            render: function (_, record) {
                return `${record.item_code} - ${record.item_description || ''}`;
            }
        },
        {
            title: 'Target Qty',
            dataIndex: 'target_qty_mt',
            key: 'target_qty_mt',
            render: function (qty) {
                return `${Number(qty || 0).toFixed(2)} MT`;
            }
        },
        {
            title: 'Shift',
            dataIndex: 'scheduled_shift',
            key: 'scheduled_shift'
        },
        {
            title: 'Start Date',
            dataIndex: 'scheduled_start_date',
            key: 'scheduled_start_date',
            render: function (date) {
                return date ? dayjs(date).format('YYYY-MM-DD') : '-';
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: function (status) {
                return getStatusTag(status);
            }
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Space>
                    <span>Filter Status:</span>
                    <Select
                        allowClear
                        placeholder="All Statuses"
                        style={{ width: 220 }}
                        value={statusFilter}
                        onChange={function (val) {
                            setStatusFilter(val);
                        }}
                        options={[
                            { label: 'Draft', value: 'Draft' },
                            { label: 'Pending Supervisor Approval', value: 'Pending_Supervisor_Approval' },
                            { label: 'Approved', value: 'Approved' },
                            { label: 'In Progress', value: 'In_Progress' },
                            { label: 'Completed', value: 'Completed' },
                            { label: 'Cancelled', value: 'Cancelled' }
                        ]}
                    />
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                onRow={function (record) {
                    return {
                        onClick: function () {
                            setSelectedPdo(record);
                            setModalOpen(true);
                        },
                        style: { cursor: 'pointer' }
                    };
                }}
            />

            <PDOAssignWorkerModal
                open={modalOpen}
                pdo={selectedPdo}
                onClose={function () {
                    setModalOpen(false);
                    setSelectedPdo(null);
                }}
                onSuccess={fetchOrders}
            />
        </div>
    );
}

export default ProductionHubOrdersView;
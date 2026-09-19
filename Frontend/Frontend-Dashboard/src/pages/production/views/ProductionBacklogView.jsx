import React, { useState, useEffect } from 'react';
import { Table, Button } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import ProductionPlanWizardModal from '../../../components/production/modals/ProductionPlanWizardModal';

function ProductionBacklogView() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedLine, setSelectedLine] = useState(null);

    async function fetchEligibleLines() {
        setLoading(true);
        try {
            const res = await axios.get('/api/production/eligible-lines');
            setData(res.data?.eligible_lines || []);
        } catch (error) {
            console.error('Failed to load eligible lines:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(function () {
        fetchEligibleLines();
    }, []);

    function handlePlanClick(record) {
        setSelectedLine(record);
        setModalOpen(true);
    }

    const columns = [
        {
            title: 'SO Number',
            dataIndex: 'so_number',
            key: 'so_number',
            render: function (text) {
                return <b style={{ color: '#10b981' }}>{text}</b>;
            },
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
        },
        {
            title: 'Product',
            key: 'product',
            render: function (_, r) {
                return `${r.item_code} - ${r.item_description}`;
            },
        },
        {
            title: 'Target Qty',
            dataIndex: 'ordered_qty_mt',
            key: 'ordered_qty_mt',
            render: function (qty) {
                return `${qty} MT`;
            },
        },
        {
            title: 'Packaging',
            dataIndex: 'packaging_kg',
            key: 'packaging_kg',
            render: function (kg) {
                return `${kg} kg Bags`;
            },
        },
        {
            title: 'Bags',
            dataIndex: 'no_of_bags',
            key: 'no_of_bags',
            render: function (count) {
                return count ? Number(count).toLocaleString() : '-';
            },
        },
        {
            title: 'Due Date',
            dataIndex: 'estimated_delivery_date',
            key: 'estimated_delivery_date',
            render: function (date) {
                return date ? dayjs(date).format('YYYY-MM-DD') : '-';
            },
        },
        {
            title: 'Action',
            key: 'action',
            render: function (_, record) {
                return (
                    <Button type="primary" onClick={function () { handlePlanClick(record); }}>
                        Plan Production
                    </Button>
                );
            },
        },
    ];

    return (
        <>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="so_line_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <ProductionPlanWizardModal
                open={modalOpen}
                selectedLine={selectedLine}
                onClose={function () { setModalOpen(false); }}
                onSuccess={fetchEligibleLines}
            />
        </>
    );
}

export default ProductionBacklogView;
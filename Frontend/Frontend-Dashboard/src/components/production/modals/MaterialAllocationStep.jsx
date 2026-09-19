import React, { useState, useEffect } from 'react';
import { Table, InputNumber, Button, Tabs, Space, Input, message } from 'antd';
import axios from 'axios';

function MaterialAllocationStep({ createdOrder, onComplete, onCancel }) {
    const [rawItemCode, setRawItemCode] = useState(createdOrder?.item_code || '');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [supplyData, setSupplyData] = useState({
        on_hand_internal: [],
        on_hand_external: [],
        incoming_ca: [],
        incoming_po: []
    });
    
    const [allocations, setAllocations] = useState({});

    function fetchSupply(itemCodeToFetch) {
        if (!itemCodeToFetch) return;
        setLoading(true);
        axios.get(`/api/production/supply-options?item_code=${itemCodeToFetch}`)
            .then(function (res) {
                if (res.data?.success) setSupplyData(res.data);
            })
            .catch(function () {
                message.error('Failed to load supply options.');
            })
            .finally(function () {
                setLoading(false);
            });
    }

    useEffect(function () {
        fetchSupply(rawItemCode);
    }, []);

    function handleQtyChange(key, itemCode, sourceType, sourceRef, qty) {
        setAllocations(function (prev) {
            const next = { ...prev };
            if (!qty || qty <= 0) {
                delete next[key];
            } else {
                next[key] = {
                    raw_item_code: itemCode,
                    source_type: sourceType,
                    source_ref: String(sourceRef),
                    allocated_qty_mt: qty
                };
            }
            return next;
        });
    }

    async function submitAllocation() {
        const payloadList = Object.values(allocations);
        if (payloadList.length === 0) {
            return message.warning('Please enter allocation quantity for at least one batch/source.');
        }

        setSubmitting(true);
        try {
            const res = await axios.post('/api/production/allocate-materials', {
                production_order_id: createdOrder.id,
                allocations: payloadList
            });
            if (res.data?.success) onComplete();
        } catch (err) {
            message.error(err.response?.data?.error || 'Allocation failed.');
        } finally {
            setSubmitting(false);
        }
    }

    function getColumns(sourceType, refField, locOrSupplierField) {
        return [
            {
                title: 'Reference / Code',
                dataIndex: refField,
                key: refField,
                render: function (text) {
                    return <b>{text}</b>;
                }
            },
            {
                title: 'Location / Origin',
                dataIndex: locOrSupplierField,
                key: locOrSupplierField,
                render: function (text) {
                    return text || '-';
                }
            },
            {
                title: 'Available (MT)',
                dataIndex: 'available_qty_mt',
                key: 'available_qty_mt',
                render: function (val) {
                    return `${Number(val || 0).toFixed(2)} MT`;
                }
            },
            {
                title: 'Allocate MT',
                key: 'allocate',
                render: function (_, record) {
                    const rowKey = `${sourceType}_${record[refField]}`;
                    const available = Number(record.available_qty_mt || 0);
                    return (
                        <InputNumber
                            min={0}
                            max={available}
                            placeholder="0.00"
                            value={allocations[rowKey]?.allocated_qty_mt}
                            onChange={function (val) {
                                handleQtyChange(rowKey, rawItemCode, sourceType, record[refField], val);
                            }}
                        />
                    );
                }
            }
        ];
    }

    const tabItems = [
        {
            key: '1',
            label: `Internal On-Hand (${supplyData.on_hand_internal.length})`,
            children: (
                <Table
                    size="small"
                    rowKey="batch_code"
                    columns={getColumns('BATCH', 'batch_code', 'location_name')}
                    dataSource={supplyData.on_hand_internal}
                    pagination={false}
                    loading={loading}
                />
            )
        },
        {
            key: '2',
            label: `External Warehouse (${supplyData.on_hand_external.length})`,
            children: (
                <Table
                    size="small"
                    rowKey="batch_code"
                    columns={getColumns('BATCH', 'batch_code', 'location_name')}
                    dataSource={supplyData.on_hand_external}
                    pagination={false}
                    loading={loading}
                />
            )
        },
        {
            key: '3',
            label: `Inbound CAs (${supplyData.incoming_ca.length})`,
            children: (
                <Table
                    size="small"
                    rowKey="supplier_ca_id"
                    columns={getColumns('INCOMING_CA', 'supplier_ca_id', 'supplier_name')}
                    dataSource={supplyData.incoming_ca}
                    pagination={false}
                    loading={loading}
                />
            )
        },
        {
            key: '4',
            label: `Open POs (${supplyData.incoming_po.length})`,
            children: (
                <Table
                    size="small"
                    rowKey="po_number"
                    columns={[
                        {
                            title: 'PO Number',
                            dataIndex: 'po_number',
                            key: 'po_number',
                            render: function (t) {
                                return <b>{t}</b>;
                            }
                        },
                        {
                            title: 'Supplier',
                            dataIndex: 'supplier_name',
                            key: 'supplier_name'
                        },
                        {
                            title: 'Available (MT)',
                            dataIndex: 'remaining_unissued_qty_mt',
                            key: 'remaining_unissued_qty_mt',
                            render: function (val) {
                                return `${Number(val || 0).toFixed(2)} MT`;
                            }
                        },
                        {
                            title: 'Allocate MT',
                            key: 'allocate',
                            render: function (_, record) {
                                const rowKey = `INCOMING_PO_${record.po_number}`;
                                const available = Number(record.remaining_unissued_qty_mt || 0);
                                return (
                                    <InputNumber
                                        min={0}
                                        max={available}
                                        placeholder="0.00"
                                        value={allocations[rowKey]?.allocated_qty_mt}
                                        onChange={function (val) {
                                            handleQtyChange(rowKey, rawItemCode, 'INCOMING_PO', record.po_number, val);
                                        }}
                                    />
                                );
                            }
                        }
                    ]}
                    dataSource={supplyData.incoming_po}
                    pagination={false}
                    loading={loading}
                />
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Input.Search
                    placeholder="Search raw material item code (e.g. URE-GRN-PRM, MOP-STD)..."
                    value={rawItemCode}
                    onChange={function (e) { setRawItemCode(e.target.value); }}
                    onSearch={function (val) { fetchSupply(val); }}
                    enterButton="Search Supply"
                />
            </div>

            <Tabs defaultActiveKey="1" items={tabItems} />

            <div style={{ textAlign: 'right', marginTop: 24 }}>
                <Space>
                    <Button onClick={onCancel}>Cancel & Keep Draft</Button>
                    <Button type="primary" onClick={submitAllocation} loading={submitting}>
                        Confirm Allocation & Submit
                    </Button>
                </Space>
            </div>
        </div>
    );
}

export default MaterialAllocationStep;
import React from 'react';
import { Card, Row, Col, Table, Tag, Progress, Typography } from 'antd';

const { Text } = Typography;

const salesOrders = [
  { key: '1', so: 'SO-7617', customer: 'Agrowana', product: 'Gold Mas', qty: '120 MT', status: 'Soft Allocated', color: 'blue' },
  { key: '2', so: 'SO-7618', customer: 'FarmPro Ltd', product: 'UREA', qty: '300 MT', status: 'Confirmed', color: 'green' },
  { key: '3', so: 'SO-7621', customer: 'AgroVista', product: 'MOP', qty: '80 MT', status: 'Oversold Risk', color: 'red' },
];

const defaultPurchaseOrders = [
  { key: '1', po: 'PO-2507', supplier: 'AgroMate', product: 'MOP', received: 200, total: 500, status: 'In Transit' },
  { key: '2', po: 'CA-1192', supplier: 'FertChem', product: 'UREA', received: 800, total: 1000, status: 'Arrived' },
  { key: '3', po: 'PO-2511', supplier: 'GreenPhos', product: 'CIRP', received: 0, total: 250, status: 'Pending' },
];

const Pipelines = ({ poPipeline = [], demandVsSupply = [] }) => {
  const pos = (poPipeline && poPipeline.length > 0)
    ? poPipeline.map((p, idx) => ({
        key: String(idx),
        po: p.po_number || 'PO',
        supplier: p.supplier || 'Supplier',
        product: 'Material',
        received: Number(p.collected_mt || 0),
        total: Number(p.ordered_mt || 100),
        status: p.status || 'In Transit',
      }))
    : defaultPurchaseOrders;

  const soColumns = [
    { title: 'SO #', dataIndex: 'so', key: 'so', render: (t) => <Text strong style={{ color: '#1890FF' }}>{t}</Text> },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', ellipsis: true },
    { title: 'Qty', dataIndex: 'qty', key: 'qty' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s, r) => <Tag color={r.color}>{s}</Tag> },
  ];

  const poColumns = [
    { title: 'PO #', dataIndex: 'po', key: 'po', render: (t) => <Text strong style={{ color: '#10B981' }}>{t}</Text> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', ellipsis: true },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, r) => {
        const pct = r.total > 0 ? Math.round((r.received / r.total) * 100) : 0;
        return (
          <div style={{ minWidth: 90 }}>
            <Text type="secondary" style={{ fontSize: 10 }}>{r.received}/{r.total} MT</Text>
            <Progress percent={pct} size="small" strokeColor="#10B981" />
          </div>
        );
      },
    },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} lg={12}>
        <Card
          bordered={false}
          style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          title={
            <div>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Demand Pipeline</Text>
              <br />
              <Text strong style={{ fontSize: 15 }}>Sales Orders</Text>
            </div>
          }
        >
          <Table dataSource={salesOrders} columns={soColumns} pagination={false} size="small" />
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card
          bordered={false}
          style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          title={
            <div>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Supply Pipeline</Text>
              <br />
              <Text strong style={{ fontSize: 15 }}>Purchase Orders</Text>
            </div>
          }
        >
          <Table dataSource={pos} columns={poColumns} pagination={false} size="small" />
        </Card>
      </Col>
    </Row>
  );
};

export default Pipelines;

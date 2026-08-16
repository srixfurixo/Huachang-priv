import React from 'react';
import { Card, Table, Tag, Progress, Typography, Empty } from 'antd';

const { Text } = Typography;

const Pipelines = ({ data = [], poPipeline, loading = false }) => {
  const items = (data && data.length > 0) ? data : (poPipeline || []);

  const pos = items.map((p, idx) => ({
    key: p.po_number || String(idx),
    po: p.po_number || 'PO',
    supplier: p.supplier || 'Supplier',
    received: Number(p.collected_mt || 0),
    total: Number(p.ordered_mt || 0),
    status: p.status || 'Active',
  }));

  const poColumns = [
    { title: 'PO #', dataIndex: 'po', key: 'po', render: (t) => <Text strong style={{ color: '#10B981' }}>{t}</Text> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'Completed' || s === 'Fully Collected' ? 'green' : 'blue'}>{s}</Tag>,
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, r) => {
        const pct = r.total > 0 ? Math.min(100, Math.round((r.received / r.total) * 100)) : 0;
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
    <Card
      loading={loading}
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Supply Pipeline</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Purchase Orders & Supplier Collections</Text>
        </div>
      }
    >
      {pos.length === 0 ? (
        <Empty description="No active purchase orders" />
      ) : (
        <Table dataSource={pos} columns={poColumns} pagination={{ pageSize: 5 }} size="small" />
      )}
    </Card>
  );
};

export default Pipelines;

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Progress, Table, Tag, Typography, Space } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const { Text, Title } = Typography;

const defaultProducts = [
  { name: 'Gold Mas', kind: 'Finished', stock: 1500, maxCap: 2000, atp: 1200 },
  { name: 'UREA', kind: 'Raw', stock: 2100, maxCap: 2500, atp: 1950 },
  { name: 'MOP', kind: 'Raw', stock: 800, maxCap: 1200, atp: 150 },
  { name: 'CIRP', kind: 'Trading', stock: 420, maxCap: 600, atp: 310 },
];

const bucketColors = ['#F43F5E', '#F97316', '#64748B', '#10B981'];

const BatchList = ({ aging = [], demandVsSupply = [] }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const formattedAging = useMemo(() => {
    if (aging && aging.length > 0) {
      return aging.map((item, index) => ({
        label: item.bucket,
        mt: Number(item.qty_mt || 0),
        batchCount: Number(item.batch_count || 0),
        color: bucketColors[index % bucketColors.length],
      }));
    }
    return [
      { label: '<30 Days', mt: 450, batchCount: 3, color: '#F43F5E' },
      { label: '30–60 Days', mt: 800, batchCount: 5, color: '#F97316' },
      { label: '60–90 Days', mt: 100, batchCount: 2, color: '#64748B' },
      { label: '180+ Days', mt: 150, batchCount: 4, color: '#10B981' },
    ];
  }, [aging]);

  const columns = [
    { title: 'Expiry Bucket', dataIndex: 'label', key: 'label', render: (t) => <Text strong>{t}</Text> },
    { title: 'Volume (MT)', dataIndex: 'mt', key: 'mt', render: (v) => <Text strong>{v} MT</Text> },
    { title: 'Batches', dataIndex: 'batchCount', key: 'batchCount', render: (v) => <Tag color="blue">{v} Batches</Tag> },
  ];

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Master Stock & Batch Explorer</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Live Stock Levels & Aging</Text>
        </div>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Select Product SKU
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defaultProducts.map((p, idx) => {
              const isSelected = selectedIdx === idx;
              const percent = Math.round((p.stock / p.maxCap) * 100);
              return (
                <div
                  key={p.name}
                  onClick={() => setSelectedIdx(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isSelected ? '#EBF5FF' : '#FAFBFD',
                    border: isSelected ? '2px solid #1890FF' : '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong style={{ color: isSelected ? '#0050B3' : '#0B1C30' }}>{p.name}</Text>
                    <Text strong style={{ color: '#1890FF' }}>{p.stock} MT</Text>
                  </div>
                  <Progress percent={percent} size="small" strokeColor="#1890FF" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748B', marginTop: 2 }}>
                    <span>ATP: {p.atp} MT</span>
                    <span>Cap: {p.maxCap} MT</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Col>

        <Col xs={24} md={16}>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Shelf-Life Expiry Histogram (MT)
          </Text>
          <div style={{ width: '100%', height: 160, marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedAging} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v} MT`, 'Volume']} />
                <Bar dataKey="mt" radius={[4, 4, 0, 0]}>
                  {formattedAging.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Table dataSource={formattedAging} columns={columns} pagination={false} size="small" rowKey="label" bordered />
        </Col>
      </Row>
    </Card>
  );
};

export default BatchList;

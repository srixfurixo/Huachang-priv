import React from 'react';
import { Card, Row, Col, Tag, Typography, Empty } from 'antd';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const { Text, Title } = Typography;

const COLORS = ['#1890FF', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#6366F1'];

const StockPie = ({ data = [], composition, loading = false }) => {
  const items = (data && data.length > 0) ? data : (composition || []);

  const chartData = items.map((c, i) => ({
    label: c.item_type || 'Category',
    value: Number(c.qty_mt || 0),
    color: COLORS[i % COLORS.length],
  }));

  const total = chartData.reduce((acc, c) => acc + c.value, 0);

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Stock Composition</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Material Category Split</Text>
        </div>
      }
    >
      {chartData.length === 0 ? (
        <Empty description="No stock composition data" />
      ) : (
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <div style={{ width: '100%', height: 180, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} MT`, 'Volume']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 10 }}>Total MT</Text>
                <Title level={4} style={{ margin: 0 }}>{total.toLocaleString()}</Title>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chartData.map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                    <Text strong style={{ fontSize: 12 }}>{s.label}</Text>
                  </span>
                  <Tag color="blue">{s.value.toLocaleString()} MT</Tag>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      )}
    </Card>
  );
};

export default StockPie;

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Select, Typography, Space } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const { Text, Title } = Typography;
const { Option } = Select;

const ALL_PRODUCTS = ['All Products', 'Gold Mas', 'UREA', 'MOP', 'CIRP'];
const ALL_TYPES = ['All Types', 'Finished', 'Raw', 'Trading'];

const defaultStockData = [
  { name: 'Gold Mas', kind: 'Finished', total: 1500, atp: 1200, committed: 300, inbound: 350 },
  { name: 'UREA', kind: 'Raw', total: 2100, atp: 1950, committed: 150, inbound: 1000 },
  { name: 'MOP', kind: 'Raw', total: 800, atp: 150, committed: 650, inbound: 200 },
  { name: 'CIRP', kind: 'Trading', total: 420, atp: 310, committed: 110, inbound: 250 },
];

const StockChart = ({ data = [], loading = false }) => {
  const [filterProduct, setFilterProduct] = useState('All Products');
  const [filterType, setFilterType] = useState('All Types');

  const baseData = useMemo(() => {
    if (data && data.length > 0) {
      return data.map((d) => ({
        name: d.item_code || d.sku || 'Item',
        kind: 'Raw',
        total: Number(d.on_hand || d.physical || 0),
        atp: Number(d.available_to_promise || d.atp || 0),
        committed: Number(d.committed || 0),
        inbound: Number(d.arriving || d.inbound || 0),
      }));
    }
    return defaultStockData;
  }, [data]);

  const chartData = useMemo(() => {
    return baseData.filter((d) => {
      const byProduct = filterProduct === 'All Products' || d.name === filterProduct;
      const byType = filterType === 'All Types' || d.kind === filterType;
      return byProduct && byType;
    });
  }, [baseData, filterProduct, filterType]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, d) => ({
        total: acc.total + d.total,
        atp: acc.atp + d.atp,
        committed: acc.committed + d.committed,
        inbound: acc.inbound + d.inbound,
      }),
      { total: 0, atp: 0, committed: 0, inbound: 0 }
    );
  }, [chartData]);

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Inventory Overview</Text>
            <br />
            <Text strong style={{ fontSize: 15 }}>Overall Stock Levels</Text>
          </div>
          <Space wrap>
            <Select value={filterProduct} onChange={setFilterProduct} style={{ width: 140 }} size="small">
              {ALL_PRODUCTS.map((p) => <Option key={p} value={p}>{p}</Option>)}
            </Select>
            <Select value={filterType} onChange={setFilterType} style={{ width: 130 }} size="small">
              {ALL_TYPES.map((t) => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Space>
        </div>
      }
    >
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis unit=" MT" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v} MT`, '']} />
            <Legend wrapperStyle={{ paddingTop: 8 }} />
            <Bar dataKey="atp" name="ATP (Available)" fill="#1890FF" radius={[4, 4, 0, 0]} />
            <Bar dataKey="committed" name="Committed" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="inbound" name="Inbound Pipeline" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col span={6}>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, textAlign: 'center', border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Total Physical</Text>
            <Title level={5} style={{ margin: '2px 0 0 0', color: '#0B1C30' }}>{totals.total.toLocaleString()} MT</Title>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ background: '#ebf5ff', padding: '10px 12px', borderRadius: 6, textAlign: 'center', border: '1px solid #bae7ff' }}>
            <Text style={{ fontSize: 11, color: '#0050b3' }}>Filtered ATP</Text>
            <Title level={5} style={{ margin: '2px 0 0 0', color: '#1890ff' }}>{totals.atp.toLocaleString()} MT</Title>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, textAlign: 'center', border: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Committed</Text>
            <Title level={5} style={{ margin: '2px 0 0 0', color: '#64748b' }}>{totals.committed.toLocaleString()} MT</Title>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: 6, textAlign: 'center', border: '1px solid #b7eb8f' }}>
            <Text style={{ fontSize: 11, color: '#135200' }}>Inbound</Text>
            <Title level={5} style={{ margin: '2px 0 0 0', color: '#10b981' }}>{totals.inbound.toLocaleString()} MT</Title>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default StockChart;

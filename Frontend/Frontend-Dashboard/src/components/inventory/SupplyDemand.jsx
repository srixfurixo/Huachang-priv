import React from 'react';
import { Card, Alert, Tag, Typography, Empty } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

const SupplyDemand = ({ data = [], demandVsSupply, loading = false }) => {
  const items = (data && data.length > 0) ? data : (demandVsSupply || []);

  const chartData = items.map((item) => ({
    name: item.item_code || 'Item',
    onHand: Number(item.on_hand_mt || 0),
    committed: Number(item.committed_mt || 0),
    arriving: Number(item.inbound_mt || 0),
    atp: Number(item.available_to_promise || 0),
  }));

  const shortages = chartData.filter((item) => item.committed > item.onHand);

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Comparative Analysis</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Demand vs Supply Matcher</Text>
        </div>
      }
    >
      {chartData.length === 0 ? (
        <Empty description="No supply & demand data" />
      ) : (
        <>
          <div style={{ width: '100%', height: Math.max(180, chartData.length * 45) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" unit=" MT" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} MT`, '']} />
                <Legend />
                <Bar dataKey="onHand" name="On-Hand (Live)" fill="#1890FF" radius={[0, 4, 4, 0]} />
                <Bar dataKey="committed" name="Committed (SO)" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                <Bar dataKey="arriving" name="Arriving (Inbound CA)" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {shortages.length > 0 && (
            <Alert
              style={{ marginTop: 12, borderRadius: 6 }}
              type="error"
              showIcon
              icon={<WarningOutlined style={{ fontSize: 16 }} />}
              message={<Text strong style={{ color: '#cf1322' }}>Critical Demand Deficit Detected</Text>}
              description={shortages.map((s) => (
                <div key={s.name} style={{ marginTop: 2 }}>
                  • <strong>{s.name}</strong>: Committed ({s.committed} MT) exceeds live physical stock ({s.onHand} MT) by{' '}
                  <Tag color="error" style={{ fontWeight: 700 }}>
                    -{s.committed - s.onHand} MT
                  </Tag>
                </div>
              ))}
            />
          )}
        </>
      )}
    </Card>
  );
};

export default SupplyDemand;

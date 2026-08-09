import React from 'react';
import { Card, Alert, Tag, Typography } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

const defaultSupplyData = [
  { name: 'MOP', onHand: 28, committed: 82, arriving: 16 },
  { name: 'CIRP', onHand: 62, committed: 47, arriving: 31 },
  { name: 'Gold Mas', onHand: 48, committed: 55, arriving: 21 },
  { name: 'UREA', onHand: 74, committed: 42, arriving: 38 },
];

const SupplyDemand = ({ demandVsSupply = [] }) => {
  const chartData = (demandVsSupply && demandVsSupply.length > 0)
    ? demandVsSupply.map((item) => ({
        name: item.item_code || 'Item',
        onHand: Number(item.on_hand || item.physical || 0),
        committed: Number(item.committed || 0),
        arriving: Number(item.arriving || item.inbound || 0),
      }))
    : defaultSupplyData;

  const shortages = chartData.filter((item) => item.committed > item.onHand);

  return (
    <Card
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
      <div style={{ width: '100%', height: Math.max(180, chartData.length * 45) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis type="number" unit=" MT" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 700 }} />
            <Tooltip formatter={(v) => [`${v} MT`, '']} />
            <Legend />
            <Bar dataKey="onHand" name="On-Hand" fill="#1890FF" radius={[0, 4, 4, 0]} />
            <Bar dataKey="committed" name="Committed (SO)" fill="#F43F5E" radius={[0, 4, 4, 0]} />
            <Bar dataKey="arriving" name="Arriving (PO)" fill="#10B981" radius={[0, 4, 4, 0]} />
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
              • <strong>{s.name}</strong>: Committed ({s.committed} MT) exceeds physical ({s.onHand} MT) by{' '}
              <Tag color="error" style={{ fontWeight: 700 }}>
                -{s.committed - s.onHand} MT
              </Tag>
            </div>
          ))}
        />
      )}
    </Card>
  );
};

export default SupplyDemand;

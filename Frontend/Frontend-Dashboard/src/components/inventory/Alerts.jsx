import React from 'react';
import { Card, Badge, Tag, Typography, Space, Divider } from 'antd';
import { AlertOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const defaultAlerts = [
  { type: 'critical', title: 'MOP Shortage Deficit', desc: 'Committed demand exceeds physical stock by -45 MT.', badge: '-45 MT Deficit' },
  { type: 'warning', title: 'CIRP Low ATP Threshold', desc: 'ATP level drops below 15% safety threshold.', badge: '14% ATP' },
  { type: 'critical', title: 'BT-GM-012 Expiry Risk', desc: '180 MT expiring in 16 days. High obsolescence risk.', badge: '16 Days Left' },
];

const Alerts = ({ alerts = [], kpis = {} }) => {
  const alertList = (alerts && alerts.length > 0)
    ? alerts.map((a) => ({
        type: a.type === 'OVERSOLD' || a.severity === 'HIGH' ? 'critical' : 'warning',
        title: a.title || a.type || 'Inventory Alert',
        desc: a.message || a.description || 'Action required',
        badge: a.severity || 'WARN',
      }))
    : defaultAlerts;

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <AlertOutlined style={{ color: '#F43F5E', fontSize: 16 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Attention Required</Text>
              <br />
              <Text strong style={{ fontSize: 15 }}>Inventory Alerts</Text>
            </div>
          </Space>
          <Badge count={alertList.length} style={{ backgroundColor: '#F43F5E' }} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertList.map((a, idx) => {
          const isCrit = a.type === 'critical';
          return (
            <div
              key={idx}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: isCrit ? '#FFF1F0' : '#FFFBE6',
                border: `1px solid ${isCrit ? '#FFA39E' : '#FFE58F'}`,
                borderLeft: `4px solid ${isCrit ? '#F43F5E' : '#F97316'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 12 }}>{a.title}</Text>
                <Tag color={isCrit ? 'error' : 'warning'} style={{ margin: 0, fontSize: 10 }}>{a.badge}</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{a.desc}</Text>
            </div>
          );
        })}

        <Divider style={{ margin: '8px 0' }} />

        <div style={{ padding: '10px 12px', borderRadius: 6, background: '#E6F4EA', border: '1px solid #B7EB8F', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          <div>
            <Text strong style={{ color: '#135200', fontSize: 12, display: 'block' }}>Gold Mas & UREA Healthy</Text>
            <Text style={{ fontSize: 10, color: '#389e0d' }}>Zero stockout risk for next 30 days.</Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Alerts;

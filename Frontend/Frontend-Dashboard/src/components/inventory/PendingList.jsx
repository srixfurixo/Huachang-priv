import React, { useState } from 'react';
import { Card, List, Button, Tag, Typography, message } from 'antd';
import { CheckCircleOutlined, CarOutlined } from '@ant-design/icons';

const { Text } = Typography;

const defaultPending = [
  { id: 'CA-101', product: 'MOP', qty: '28 MT', loc: 'Jenjarom Dock 1', wait: '4h' },
  { id: 'CA-102', product: 'CIRP', qty: '15 MT', loc: 'YAL 3 Dock A', wait: '1.5h' },
  { id: 'CA-103', product: 'UREA', qty: '42 MT', loc: 'Jenjarom Dock 2', wait: '45m' },
];

const PendingList = ({ activeCaCount = 0, onVerifyItem }) => {
  const [list, setList] = useState(defaultPending);
  const [loadingId, setLoadingId] = useState(null);

  const handleVerify = async (id) => {
    setLoadingId(id);
    try {
      if (onVerifyItem) await onVerifyItem(id);
      setList((prev) => prev.filter((item) => item.id !== id));
      message.success(`Verified collection advice ${id}`);
    } catch {
      message.error('Verification failed');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Inbound Queue</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Pending Verifications ({activeCaCount || list.length})</Text>
        </div>
      }
    >
      <List
        size="small"
        dataSource={list}
        locale={{ emptyText: 'No pending verifications' }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={loadingId === item.id}
                onClick={() => handleVerify(item.id)}
                style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
              >
                Verify & Intake
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<CarOutlined style={{ fontSize: 20, color: '#10B981' }} />}
              title={<Text strong>{item.product} ({item.qty})</Text>}
              description={<Text type="secondary" style={{ fontSize: 11 }}>Loc: {item.loc} · Wait: {item.wait}</Text>}
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default PendingList;

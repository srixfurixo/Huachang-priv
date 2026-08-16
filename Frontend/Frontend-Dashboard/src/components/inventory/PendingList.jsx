import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, message } from 'antd';
import { CheckCircleOutlined, CarOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

const PendingList = ({ activeCaCount = 0, onVerifyItem }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(null);

  const fetchPendingBatches = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/inventory/batches', {
        params: { status_confidence: 'Pending' }
      });
      if (res.data && res.data.success) {
        setList(res.data.batches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBatches();
  }, []);

  const handleVerify = async (batchCode) => {
    setLoadingCode(batchCode);
    try {
      await axios.patch(`/api/inventory/intake/${encodeURIComponent(batchCode)}/verify`);
      message.success(`Verified batch ${batchCode}`);
      if (onVerifyItem) {
        await onVerifyItem(batchCode);
      }
      fetchPendingBatches();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Inbound Queue</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Pending Verifications ({list.length})</Text>
        </div>
      }
    >
      <List
        size="small"
        dataSource={list}
        locale={{ emptyText: 'No pending batch verifications' }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                key="verify"
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={loadingCode === item.batch_code}
                onClick={() => handleVerify(item.batch_code)}
                style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
              >
                Verify & Intake
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<CarOutlined style={{ fontSize: 20, color: '#10B981' }} />}
              title={<Text strong>{item.batch_code} - {item.item_code} ({item.current_qty} {item.uom || 'MT'})</Text>}
              description={
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Loc: {item.location} {item.hg_ca_number ? `· CA: ${item.hg_ca_number}` : ''}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default PendingList;

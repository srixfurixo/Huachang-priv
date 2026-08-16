import React from 'react';
import { Card, List, Tag, Typography, Badge, Empty } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, SwapOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Movements = ({ data = [], movements, loading = false }) => {
  const items = (data && data.length > 0) ? data : (movements || []);

  const list = items.map((m) => {
    const typeUpper = (m.movement_type || '').toUpperCase();
    const isOut = typeUpper.includes('DISPATCH') || typeUpper.includes('OUT') || typeUpper.includes('SALES');
    const isTransfer = typeUpper.includes('TRANSFER');
    return {
      id: m.id,
      dir: isTransfer ? 'transfer' : (isOut ? 'out' : 'in'),
      label: m.movement_type || 'INTAKE',
      product: m.item_code || 'Item',
      qty: `${isOut ? '−' : '+'}${Number(m.quantity_mt || 0).toLocaleString()} MT`,
      loc: m.location || 'Warehouse',
      time: m.movement_date ? new Date(m.movement_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      ref: m.performed_by ? `By: ${m.performed_by}` : `ID: ${m.id}`,
    };
  });

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Live Activity</Text>
            <br />
            <Text strong style={{ fontSize: 15 }}>Movement Feed</Text>
          </div>
          <Tag color="success">
            <Badge status="processing" color="#52c41a" /> LIVE
          </Tag>
        </div>
      }
    >
      {list.length === 0 ? (
        <Empty description="No recent movements" />
      ) : (
        <List
          size="small"
          dataSource={list}
          renderItem={(item) => {
            let tagColor = 'success';
            let icon = <ArrowDownOutlined />;
            if (item.dir === 'out') {
              tagColor = 'error';
              icon = <ArrowUpOutlined />;
            } else if (item.dir === 'transfer') {
              tagColor = 'processing';
              icon = <SwapOutlined />;
            }

            return (
              <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Tag color={tagColor} icon={icon} style={{ borderRadius: 4, fontWeight: 700 }}>
                      {item.label}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>{item.ref}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <div>
                      <Text strong style={{ fontSize: 13, display: 'block' }}>{item.product}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>Loc: {item.loc}</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text strong style={{ color: item.dir === 'out' ? '#f5222d' : '#52c41a', fontSize: 13, display: 'block' }}>
                        {item.qty}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default Movements;

import React from 'react';
import { Card, Badge, Tag, Typography, Space, Empty } from 'antd';
import { AlertOutlined } from '@ant-design/icons';

const { Text } = Typography;

function formatAlert(a) {
  let title = a.type || 'Alert';
  let detail = '';
  let action = '';

  switch (a.type) {
    case 'OUT_OF_STOCK':
      title = `Out of Stock: ${a.item_code}`;
      detail = `Item ${a.item_code} (${a.description || ''}) is out of stock with open sales orders.`;
      action = 'Expedite incoming supply or reallocate sales orders.';
      break;
    case 'LOW_STOCK':
      title = `Low Stock: ${a.item_code}`;
      detail = `Current stock (${a.atp_qty || 0} MT) is below threshold (${a.threshold_level || 0} MT).`;
      action = 'Plan replenishment for this item.';
      break;
    case 'EXPIRED':
      title = `Expired Batch: ${a.batch_code}`;
      detail = `Batch ${a.batch_code} (${a.item_code}) expired on ${a.expiry_date ? String(a.expiry_date).split('T')[0] : ''} with ${a.current_qty} MT at ${a.location || 'site'}.`;
      action = 'Remove or adjust expired stock.';
      break;
    case 'EXPIRING':
      title = `Expiring Stock: ${a.batch_code}`;
      detail = `Batch ${a.batch_code} (${a.item_code}) expires in ${a.days_left ?? '<30'} days (${a.current_qty} MT).`;
      action = 'Prioritise this batch for dispatch (FIFO).';
      break;
    case 'PENDING_VERIFICATION':
      title = `Pending Verification: ${a.batch_code}`;
      detail = `Batch ${a.batch_code} has been awaiting verification for over 24 hours.`;
      action = 'Have a supervisor verify or reject intake.';
      break;
    case 'CA_NOT_RECEIVED':
      title = `CA Delivery Overdue: ${a.hg_ca_number}`;
      detail = `Truck CA ${a.hg_ca_number} was dispatched on ${a.ca_date ? String(a.ca_date).split('T')[0] : ''} and not yet received.`;
      action = 'Follow up with transporter or driver.';
      break;
    case 'PO_OVERDUE':
      title = `PO Overdue: ${a.po_number}`;
      detail = `Purchase order ${a.po_number} has ${a.uncollected_qty} MT uncollected after 30 days.`;
      action = 'Chase supplier for collection.';
      break;
    default:
      title = a.type || 'Inventory Alert';
      detail = a.detail || a.message || 'Action required';
      action = a.action || '';
  }

  return { ...a, title, detail, action };
}

const Alerts = ({ data = [], alerts, loading = false }) => {
  const rawList = (data && data.length > 0) ? data : (alerts || []);
  const alertList = rawList.map(formatAlert);

  return (
    <Card
      loading={loading}
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
      {alertList.length === 0 ? (
        <Empty description="No active alerts" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alertList.map((a, idx) => {
            const isCrit = a.severity === 'Critical';
            const isHigh = a.severity === 'High';
            const tagColor = isCrit ? 'error' : (isHigh ? 'warning' : 'gold');
            const borderColor = isCrit ? '#FFA39E' : (isHigh ? '#FFE58F' : '#D9D9D9');
            const bgColor = isCrit ? '#FFF1F0' : (isHigh ? '#FFFBE6' : '#FAFAFA');
            const leftBar = isCrit ? '#F43F5E' : (isHigh ? '#F97316' : '#1890FF');

            return (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderLeft: `4px solid ${leftBar}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>{a.title}</Text>
                  <Tag color={tagColor} style={{ margin: 0, fontSize: 10 }}>{a.severity || 'WARN'}</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{a.detail}</Text>
                {a.action && (
                  <Text style={{ fontSize: 11, color: '#1890FF', marginTop: 4, display: 'block' }}>
                    Action: {a.action}
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default Alerts;

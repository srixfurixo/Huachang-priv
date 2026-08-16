import React from 'react';
import { Card, Row, Col, Typography, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, StockOutlined, CheckCircleOutlined, ImportOutlined, WarningOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const KpiCards = ({ data = {}, kpis, loading = false }) => {
  const kpiData = data || kpis || {};
  const totalOnHand = Number(kpiData.total_on_hand_mt || 0);
  const liveMt = Number(kpiData.live_mt || 0);
  const reportedMt = Number(kpiData.reported_mt || 0);
  const atpMt = Number(kpiData.available_to_promise_mt || 0);
  const inboundMt = Number(kpiData.inbound_mt || 0);
  const activeCaCount = Number(kpiData.active_ca_count || 0);
  const expiring60d = Number(kpiData.expiring_60d_mt || 0);
  const netChange7d = Number(kpiData.net_change_7d_mt || 0);

  const cards = [
    {
      title: 'TOTAL PHYSICAL STOCK',
      value: `${totalOnHand.toLocaleString()} MT`,
      sub: `Live: ${liveMt.toLocaleString()} MT | Reported: ${reportedMt.toLocaleString()} MT`,
      border: '#1890FF',
      icon: <StockOutlined style={{ fontSize: 18, color: '#1890FF' }} />,
      tag: (
        <Tag color={netChange7d >= 0 ? 'success' : 'error'} icon={netChange7d >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {netChange7d >= 0 ? '+' : ''}{netChange7d} MT (7d)
        </Tag>
      ),
    },
    {
      title: 'AVAILABLE TO PROMISE (ATP)',
      value: `${atpMt.toLocaleString()} MT`,
      sub: 'Physical stock minus committed sales',
      border: '#10B981',
      icon: <CheckCircleOutlined style={{ fontSize: 18, color: '#10B981' }} />,
      tag: <Tag color="success">ATP</Tag>,
    },
    {
      title: 'INBOUND SUPPLY PIPELINE',
      value: `${inboundMt.toLocaleString()} MT`,
      sub: `${activeCaCount} active CAs in transit`,
      border: '#1890FF',
      icon: <ImportOutlined style={{ fontSize: 18, color: '#1890FF' }} />,
      tag: <Tag color="purple">{activeCaCount} CAs</Tag>,
    },
    {
      title: 'EXPIRING RISK (<60D)',
      value: `${expiring60d.toLocaleString()} MT`,
      sub: 'Requires immediate FIFO dispatch',
      border: '#F43F5E',
      icon: <WarningOutlined style={{ fontSize: 18, color: '#F43F5E' }} />,
      tag: <Tag color="error">Urgent</Tag>,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((c) => (
        <Col xs={24} sm={12} lg={6} key={c.title}>
          <Card
            loading={loading}
            bordered={false}
            style={{
              borderRadius: 8,
              borderLeft: `4px solid ${c.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>{c.title}</Text>
              {c.icon}
            </div>
            <Title level={3} style={{ margin: '8px 0', color: c.border === '#F43F5E' ? '#F43F5E' : '#0B1C30' }}>
              {c.value}
            </Title>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>{c.sub}</Text>
              {c.tag}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KpiCards;

import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Button, Space, message } from 'antd';
import { SyncOutlined, DownloadOutlined } from '@ant-design/icons';
import axios from 'axios';

import AppLayout from '../components/layout/AppLayout';
import KpiCards from '../components/inventory/KpiCards';
import Movements from '../components/inventory/Movements';
import StockChart from '../components/inventory/StockChart';
import BatchList from '../components/inventory/BatchList';
import SupplyDemand from '../components/inventory/SupplyDemand';
import StockPie from '../components/inventory/StockPie';
import PendingList from '../components/inventory/PendingList';
import Pipelines from '../components/inventory/Pipelines';
import Alerts from '../components/inventory/Alerts';

const { Title, Text } = Typography;

const InventoryDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    kpis: {},
    composition: [],
    aging: [],
    demand_vs_supply: [],
    po_pipeline: [],
    alerts: [],
    recent_movements: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/inventory/dashboard/summary');
      if (res.data && res.data.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load inventory summary', err);
      message.error('Failed to load inventory dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <AppLayout breadcrumbs={['Operations', 'Inventory Dashboard']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#1890FF' }}>
            OPERATIONS OVERVIEW
          </Text>
          <Title level={2} style={{ margin: '2px 0 0 0', color: '#0B1C30', fontWeight: 800 }}>
            Inventory Command Center
          </Title>
        </div>

        <Space wrap>
          <Button icon={<SyncOutlined spin={loading} />} onClick={fetchData} loading={loading}>
            Refresh
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => message.success('Exported CSV')}>
            Export CSV
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <KpiCards data={summary.kpis} loading={loading} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={5}>
          <Movements data={summary.recent_movements} loading={loading} />
        </Col>

        <Col xs={24} lg={13}>
          <StockChart data={summary.aging} loading={loading} />
          <BatchList />
          <SupplyDemand data={summary.demand_vs_supply} loading={loading} />
          <StockPie data={summary.composition} loading={loading} />
          <PendingList activeCaCount={summary.kpis?.active_ca_count || 0} onVerifyItem={fetchData} />
          <Pipelines data={summary.po_pipeline} loading={loading} />
        </Col>

        <Col xs={24} lg={6}>
          <Alerts data={summary.alerts} loading={loading} />
        </Col>
      </Row>
    </AppLayout>
  );
};

export default InventoryDashboard;

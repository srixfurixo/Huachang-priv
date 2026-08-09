import React, { useState, useEffect } from 'react';
import { Row, Col, Input, Select, Button, Space, Typography, message } from 'antd';
import { SearchOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons';
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
const { Option } = Select;

const InventoryDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  const [data, setData] = useState({
    kpis: {},
    demand_vs_supply: [],
    composition: [],
    aging: [],
    po_pipeline: [],
    alerts: [],
    recent_movements: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchQuery || undefined,
        location_id: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
      };

      let res;
      try {
        res = await axios.get('/api/dashboard/summary', { params });
      } catch (e) {
        res = await axios.get('/api/inventory/dashboard/summary', { params });
      }

      if (res && res.data && res.data.success) {
        setData({
          kpis: res.data.kpis || {},
          demand_vs_supply: res.data.demand_vs_supply || [],
          composition: res.data.composition || [],
          aging: res.data.aging || [],
          po_pipeline: res.data.po_pipeline || [],
          alerts: res.data.alerts || [],
          recent_movements: res.data.recent_movements || [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouse]);

  return (
    <AppLayout breadcrumbs={['Operations', 'Inventory Dashboard']}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#1890FF' }}>
            OPERATIONS OVERVIEW · 12 AUG 2026
          </Text>
          <Title level={2} style={{ margin: '2px 0 0 0', color: '#0B1C30', fontWeight: 800 }}>
            Inventory Command Center
          </Title>
        </div>

        <Space wrap>
          <Input
            placeholder="Search SKU / Batch..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={fetchData}
            style={{ width: 220, borderRadius: 6 }}
          />

          <Select
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            style={{ width: 180 }}
          >
            <Option value="ALL">All Warehouses</Option>
          </Select>

          <Button icon={<SyncOutlined spin={loading} />} onClick={fetchData} loading={loading}>
            Refresh
          </Button>

          <Button type="primary" icon={<DownloadOutlined />} onClick={() => message.success('Exported CSV')}>
            Export CSV
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <KpiCards kpis={data.kpis} loading={loading} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={5}>
          <Movements movements={data.recent_movements} loading={loading} />
        </Col>

        <Col xs={24} lg={13}>
          <StockChart data={data.demand_vs_supply} loading={loading} />
          <BatchList aging={data.aging} demandVsSupply={data.demand_vs_supply} />
          <SupplyDemand demandVsSupply={data.demand_vs_supply} />
          <StockPie composition={data.composition} />
          <PendingList activeCaCount={data.kpis?.active_ca_count || 0} onVerifyItem={fetchData} />
          <Pipelines poPipeline={data.po_pipeline} demandVsSupply={data.demand_vs_supply} />
        </Col>

        <Col xs={24} lg={6}>
          <Alerts alerts={data.alerts} kpis={data.kpis} />
        </Col>
      </Row>
    </AppLayout>
  );
};

export default InventoryDashboard;

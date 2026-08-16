import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Tag, Typography, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;
const { Option } = Select;

const BatchList = () => {
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusConfidence, setStatusConfidence] = useState('');
  const [locationId, setLocationId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLocations = async () => {
    try {
      const res = await axios.get('/api/referenceData/locations');
      if (res.data) {
        setLocations(Array.isArray(res.data) ? res.data : (res.data.locations || []));
      }
    } catch {
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (search) {
        params.batch_code = search;
      }
      if (statusConfidence) {
        params.status_confidence = statusConfidence;
      }
      if (locationId) {
        params.location_id = locationId;
      }

      const res = await axios.get('/api/inventory/batches', { params });
      if (res.data && res.data.success) {
        setBatches(res.data.batches || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load inventory batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [page, statusConfidence, locationId]);

  const columns = [
    {
      title: 'Batch Code',
      dataIndex: 'batch_code',
      key: 'batch_code',
      render: (t) => <Text strong style={{ color: '#1890FF' }}>{t}</Text>,
    },
    {
      title: 'Item Code',
      dataIndex: 'item_code',
      key: 'item_code',
      render: (t, r) => (
        <div>
          <Text strong>{t}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>{r.description}</div>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Current Qty',
      dataIndex: 'current_qty',
      key: 'current_qty',
      align: 'right',
      render: (v, r) => `${Number(v).toLocaleString()} ${r.uom || 'MT'}`,
    },
    {
      title: 'Status',
      dataIndex: 'status_confidence',
      key: 'status_confidence',
      render: (status) => {
        let color = 'default';
        if (status === 'Live') color = 'green';
        else if (status === 'Reported') color = 'gold';
        else if (status === 'Pending') color = 'blue';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (d, r) => {
        if (!d) return '-';
        const formatted = d.split('T')[0];
        const days = r.days_to_expiry;
        return (
          <div>
            <span>{formatted}</span>
            {days !== null && days !== undefined && (
              <span style={{ fontSize: 11, color: days < 30 ? '#f5222d' : '#64748B', display: 'block' }}>
                ({days} days left)
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}
      title={
        <div>
          <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Inventory Batches</Text>
          <br />
          <Text strong style={{ fontSize: 15 }}>Batch & Stock Explorer</Text>
        </div>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search batch code..."
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={() => { setPage(1); fetchBatches(); }}
          style={{ width: 200 }}
          allowClear
        />

        <Select
          placeholder="Filter by Status"
          value={statusConfidence || undefined}
          onChange={(val) => { setStatusConfidence(val); setPage(1); }}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="Live">Live</Option>
          <Option value="Reported">Reported</Option>
          <Option value="Pending">Pending</Option>
        </Select>

        <Select
          placeholder="Filter by Location"
          value={locationId || undefined}
          onChange={(val) => { setLocationId(val); setPage(1); }}
          style={{ width: 170 }}
          allowClear
        >
          {locations.map((loc) => (
            <Option key={loc.id} value={loc.id}>{loc.name}</Option>
          ))}
        </Select>
      </Space>

      <Table
        dataSource={batches}
        columns={columns}
        rowKey="batch_code"
        loading={loading}
        size="small"
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
          showTotal: (total) => `Total ${total} batches`,
        }}
      />
    </Card>
  );
};

export default BatchList;

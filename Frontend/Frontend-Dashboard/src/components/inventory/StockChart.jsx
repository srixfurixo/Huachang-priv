import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Row, Col } from 'antd';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import axios from 'axios';

const { Text } = Typography;

const BUCKET_LABELS = ['<30 Days', '30–60 Days', '60–90 Days', '180+ Days'];
const BUCKET_COLORS = ['#F43F5E', '#FDBA74', '#CBD5E1', '#86EFAC'];

const StockChart = () => {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedBucket, setSelectedBucket] = useState(0);

  useEffect(() => {
    axios.get('/api/inventory/availability').then((res) => {
      if (res.data?.success) {
        const rawList = res.data.availability || [];
        const allItems = [];
        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          allItems.push({
            name: item.item_code,
            onHand: Number(item.on_hand_mt || 0),
            atp: Number(item.available_to_promise || 0),
            committed: Number(item.committed_mt || 0),
            inbound: Number(item.inbound_mt || 0),
            isOversold: item.is_oversold,
          });
        }
        setProducts(allItems);
        if (allItems.length > 0) setSelectedProduct(allItems[0].name);
      }
    });

    axios.get('/api/inventory/batches', { params: { limit: 1000 } }).then((res) => {
      if (res.data?.success) {
        setBatches(res.data.batches || []);
      }
    });
  }, []);

  let totalPhysical = 0, totalAtp = 0, totalCommitted = 0, totalInbound = 0;
  for (let i = 0; i < products.length; i++) {
    totalPhysical += products[i].onHand;
    totalAtp += products[i].atp;
    totalCommitted += products[i].committed;
    totalInbound += products[i].inbound;
  }

  const bucketTotals = [0, 0, 0, 0];
  const currentBatches = [];

  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    if (b.item_code === selectedProduct) {
      const days = b.days_to_expiry !== null && b.days_to_expiry !== undefined ? Number(b.days_to_expiry) : 999;
      let bucketIdx = 3;
      if (days < 30) bucketIdx = 0;
      else if (days < 60) bucketIdx = 1;
      else if (days < 90) bucketIdx = 2;

      bucketTotals[bucketIdx] += Number(b.current_qty || 0);

      currentBatches.push({
        batch_code: b.batch_code,
        location: b.location,
        status: b.status_confidence,
        qty: Number(b.current_qty || 0),
        expiry: b.expiry_date ? b.expiry_date.split('T')[0] : '-',
        daysLeft: days === 999 ? '-' : `${days}d`,
        isUrgent: days < 30,
        bucketIdx: bucketIdx,
      });
    }
  }

  const histogramData = [
    { name: BUCKET_LABELS[0], qty: bucketTotals[0] },
    { name: BUCKET_LABELS[1], qty: bucketTotals[1] },
    { name: BUCKET_LABELS[2], qty: bucketTotals[2] },
    { name: BUCKET_LABELS[3], qty: bucketTotals[3] },
  ];

  const displayBatches = [];
  for (let i = 0; i < currentBatches.length; i++) {
    if (currentBatches[i].bucketIdx === selectedBucket) {
      displayBatches.push(currentBatches[i]);
    }
  }

  const tableColumns = [
    { title: 'BATCH CODE', dataIndex: 'batch_code', render: (t) => <b>{t}</b> },
    { title: 'LOCATION', dataIndex: 'location' },
    {
      title: 'STATUS',
      dataIndex: 'status',
      render: (s) => <Tag color={s === 'Live' ? 'green' : 'gold'}>● {s}</Tag>,
    },
    {
      title: 'QTY (MT)',
      dataIndex: 'qty',
      render: (v) => `${Number(v).toFixed(2)} MT`,
    },
    { title: 'EXPIRY', dataIndex: 'expiry' },
    {
      title: 'DAYS LEFT',
      dataIndex: 'daysLeft',
      render: (d, r) => <span style={{ color: r.isUrgent ? '#F43F5E' : '#0B1C30', fontWeight: 'bold' }}>{d}</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        bordered={false}
        style={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
        title={
          <div>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>INVENTORY OVERVIEW</Text>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Overall Stock Levels</h2>
          </div>
        }
      >
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={products} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v} MT`} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="atp" name="ATP (Available)" fill="#1890FF" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="committed" name="Committed" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="inbound" name="Inbound Pipeline" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          <Col xs={12} sm={6}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>TOTAL PHYSICAL</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0B1C30' }}>{totalPhysical.toLocaleString()} MT</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>TOTAL ATP</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1890FF' }}>{totalAtp.toLocaleString()} MT</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>TOTAL COMMITTED</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#64748B' }}>{totalCommitted.toLocaleString()} MT</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>INBOUND</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>{totalInbound.toLocaleString()} MT</div>
            </div>
          </Col>
        </Row>
      </Card>

      <Card
        bordered={false}
        style={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
        title={
          <div>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>MASTER STOCK &amp; BATCH EXPLORER</Text>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Live Stock Levels</h2>
          </div>
        }
      >
        <Row gutter={[20, 20]}>
          <Col xs={24} md={9}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '460px', overflowY: 'auto', paddingRight: 6 }}>
              {products.map((p) => {
                const isSelected = p.name === selectedProduct;
                return (
                  <div
                    key={p.name}
                    onClick={() => { setSelectedProduct(p.name); setSelectedBucket(0); }}
                    style={{
                      border: isSelected ? '2px solid #1890FF' : '1px solid #E2E8F0',
                      background: isSelected ? '#EBF5FF' : '#FFFFFF',
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</span>
                      {p.isOversold && <Tag color="red">Shortage</Tag>}
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace' }}>{p.onHand} MT</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      ATP: <b>{p.atp} MT</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </Col>

          <Col xs={24} md={15}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
              <Text type="secondary" style={{ fontSize: 10, fontWeight: 700 }}>BATCH DRILL-DOWN</Text>
              <h3 style={{ margin: '2px 0 10px 0', fontSize: 14 }}>Batch &amp; Expiry Explorer — <b>{selectedProduct}</b></h3>

              <div style={{ width: '100%', height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v} MT`} />
                    <Bar dataKey="qty" radius={[4, 4, 0, 0]} barSize={32} onClick={(_, idx) => setSelectedBucket(idx)}>
                      {histogramData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={BUCKET_COLORS[idx]}
                          style={{ cursor: 'pointer', opacity: selectedBucket === idx ? 1 : 0.4 }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '6px 12px', borderRadius: 6, margin: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#E11D48' }}>● {BUCKET_LABELS[selectedBucket]}</span>
                <span style={{ fontSize: 11, fontWeight: 800 }}>{histogramData[selectedBucket]?.qty || 0} MT</span>
              </div>

              <Table
                dataSource={displayBatches}
                columns={tableColumns}
                rowKey="batch_code"
                pagination={false}
                size="small"
              />
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default StockChart;
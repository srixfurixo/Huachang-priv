import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Spin, Table, Tag, message } from 'antd';
import DocumentListSection from '../common/DocumentListSection';

function CollectionAdviceDetailModal({ open, onClose, hgCaNumber }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && hgCaNumber) {
      setLoading(true);
      axios.get(`/api/logistics/huachang-ca/${encodeURIComponent(hgCaNumber)}`)
        .then((res) => {
          setData(res.data);
        })
        .catch(() => {
          message.error('Failed to load collection advice details.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [open, hgCaNumber]);

  const ca = data?.collection_advice;
  const batches = data?.received_batches || [];

  return (
    <Modal
      title={`Collection Advice Details: ${hgCaNumber || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={750}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : ca ? (
        <div>
          <p><strong>HG CA Number:</strong> {ca.hg_ca_number}</p>
          <p><strong>Status:</strong> <Tag color="blue">{ca.status}</Tag></p>
          <p><strong>CA Date:</strong> {ca.ca_date}</p>
          <p><strong>Item Code:</strong> {ca.item_code} - {ca.item_description}</p>
          <p><strong>Quantity:</strong> {ca.quantity_mt} MT</p>
          <p><strong>PO Number:</strong> {ca.po_number}</p>
          <p><strong>Supplier CA Ref:</strong> {ca.supplier_ca_ref}</p>
          <p><strong>Pickup Location:</strong> {ca.pickup_location_name}</p>
          <p><strong>Destination:</strong> {ca.destination_type} {ca.destination_id ? `(ID: ${ca.destination_id})` : ''}</p>
          <p><strong>Transporter:</strong> {ca.transporter_name || 'N/A'}</p>
          <p><strong>Driver Name:</strong> {ca.driver_name || 'N/A'}</p>
          <p><strong>Lorry Number:</strong> {ca.lorry_number || 'N/A'}</p>
          <p><strong>Created By:</strong> {ca.created_by || 'System'}</p>

          <h4 style={{ marginTop: 20 }}>Received Batches</h4>
          <Table
            dataSource={batches}
            rowKey="batch_code"
            size="small"
            pagination={false}
            columns={[
              { title: 'Batch Code', dataIndex: 'batch_code' },
              { title: 'Item Code', dataIndex: 'item_code' },
              { title: 'Current Qty (MT)', dataIndex: 'current_qty' },
              { title: 'Location', dataIndex: 'location' },
              { title: 'Status Confidence', dataIndex: 'status_confidence', render: (s) => <Tag color="green">{s}</Tag> },
            ]}
          />

          <DocumentListSection documentType="CA" referenceNumber={hgCaNumber} />
        </div>
      ) : null}
    </Modal>
  );
}

export default CollectionAdviceDetailModal;

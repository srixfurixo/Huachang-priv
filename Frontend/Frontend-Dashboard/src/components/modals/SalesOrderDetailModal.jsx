import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Spin, Table, Tag, message } from 'antd';
import DocumentListSection from '../common/DocumentListSection';

function SalesOrderDetailModal({ open, onClose, soNumber }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && soNumber) {
      setLoading(true);
      axios.get(`/api/orders/sales/${soNumber}`)
        .then((res) => {
          setData(res.data);
        })
        .catch(() => {
          message.error('Failed to load sales order details.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [open, soNumber]);

  const so = data?.sales_order;
  const allocations = data?.allocations || [];

  return (
    <Modal
      title={`Sales Order Details: ${soNumber || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : so ? (
        <div>
          <p><strong>SO Number:</strong> {so.so_number}</p>
          <p><strong>Status:</strong> <Tag color="blue">{so.status}</Tag></p>
          <p><strong>Customer:</strong> {so.customer_name} ({so.debtor_code || 'N/A'})</p>
          <p><strong>Item Code:</strong> {so.item_code} - {so.item_description}</p>
          <p><strong>SO Date:</strong> {so.so_date}</p>
          <p><strong>Ordered Quantity:</strong> {so.ordered_qty_mt} MT</p>
          <p><strong>Created By:</strong> {so.created_by || 'System'}</p>

          <h4 style={{ marginTop: 20 }}>Active Allocations</h4>
          <h4>pending fix and db redo</h4>

          <DocumentListSection documentType="SO" referenceNumber={soNumber} />
        </div>
      ) : null}
    </Modal>
  );
}

export default SalesOrderDetailModal;

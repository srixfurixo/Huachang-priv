import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Spin, Table, Tag, message } from 'antd';
import DocumentListSection from '../common/DocumentListSection';

function PurchaseOrderDetailModal({ open, onClose, poNumber }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && poNumber) {
      setLoading(true);
      axios.get(`/api/orders/purchase/${poNumber}`)
        .then((res) => {
          setData(res.data);
        })
        .catch(() => {
          message.error('Failed to load purchase order details.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [open, poNumber]);

  const po = data?.purchase_order;
  const scas = data?.supplier_collection_advices || [];

  return (
    <Modal
      title={`Purchase Order Details: ${poNumber || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : po ? (
        <div>
          <p><strong>PO Number:</strong> {po.po_number}</p>
          <p><strong>Status:</strong> <Tag color="blue">{po.status}</Tag></p>
          <p><strong>Supplier:</strong> {po.supplier_name}</p>
          <p><strong>Item Code:</strong> {po.item_code} - {po.item_description}</p>
          <p><strong>PO Date:</strong> {po.po_date}</p>
          <p><strong>Ordered Quantity:</strong> {po.ordered_qty_mt} MT</p>
          <p><strong>Allocated Quantity:</strong> {po.total_allocated_mt} MT</p>
          <p><strong>Remaining Balance:</strong> {po.remaining_balance_mt} MT</p>
          <p><strong>Created By:</strong> {po.created_by || 'System'}</p>

          <h4 style={{ marginTop: 20 }}>Supplier Collection Advices</h4>
          <Table
            dataSource={scas}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Ref #', dataIndex: 'supplier_ca_ref' },
              { title: 'CA Date', dataIndex: 'ca_date' },
              { title: 'Available Qty (MT)', dataIndex: 'available_qty_mt', align: 'right' },
            ]}
          />

          <DocumentListSection documentType="PO" referenceNumber={poNumber} />
        </div>
      ) : null}
    </Modal>
  );
}

export default PurchaseOrderDetailModal;

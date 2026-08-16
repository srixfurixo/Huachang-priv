import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Typography, Tag, message } from 'antd';
import { EyeOutlined, FilePdfOutlined, PaperClipOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

export default function DocumentListSection({ documentType, referenceNumber }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!documentType || !referenceNumber) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/documents/${documentType}/${referenceNumber}`);
        if (res.data.success) {
          setDocuments(res.data.documents || []);
        }
      } catch (err) {
        message.error('Failed to load attached documents.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [documentType, referenceNumber]);

  const columns = [
    {
      title: 'Document Name',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (text) => (
        <Space>
          <FilePdfOutlined style={{ color: '#ff4d4f' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'file_size_bytes',
      key: 'file_size_bytes',
      render: (bytes) => {
        if (!bytes) return '—';
        const kb = bytes / 1024;
        return kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
      },
    },
    {
      title: 'Uploaded At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '—'),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => window.open(`/api/documents/${record.id}/view`, '_blank')}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <Space style={{ marginBottom: 12 }}>
        <PaperClipOutlined />
        <Text strong>Attached Documents</Text>
        <Tag color="blue">{documents.length}</Tag>
      </Space>

      <Table
        size="small"
        columns={columns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'No attachments uploaded for this record.' }}
      />
    </div>
  );
}
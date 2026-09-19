import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Descriptions, TreeSelect, Tag, Space, Card, Spin, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

function PDOAssignWorkerModal({ open, onClose, pdo, onSuccess }) {
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedWorkerIds([]);
      setLoadingWorkers(true);
      axios.get('/api/production/workers/available')
        .then((res) => {
          if (res.data.success) {
            setAvailableWorkers(res.data.data || []);
          }
        })
        .catch(() => {
          message.error('Failed to load available workers.');
        })
        .finally(() => {
          setLoadingWorkers(false);
        });
    } else {
      setSelectedWorkerIds([]);
      setAvailableWorkers([]);
    }
  }, [open]);

  const treeData = availableWorkers.map((w) => ({
    title: `${w.first_name} ${w.last_name} (${w.staff_id || 'ID: ' + w.worker_id})`,
    value: w.worker_id,
    key: w.worker_id,
  }));

  const handleAssign = async () => {
    if (selectedWorkerIds.length === 0) {
      message.warning('Please select at least one worker to assign.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        slot_date: pdo?.scheduled_start_date,
        shift_name: pdo?.scheduled_shift || 'Morning',
        assignments: selectedWorkerIds.map((id) => ({
          worker_id: id,
          role_in_production: 'Floor Operator',
        })),
      };

      const res = await axios.post(`/api/production/orders/${pdo.id}/assign-workers`, payload);
      if (res.data.success) {
        message.success('Workers successfully assigned!');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      message.error(err.response?.data?.error || err.response?.data?.message || 'Failed to assign workers.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Assign Workers: ${pdo?.production_order_code || ''}`}
      open={open}
      onCancel={onClose}
      onOk={handleAssign}
      okText="Confirm Assignment"
      confirmLoading={submitting}
      width={720}
      destroyOnClose
    >
      {pdo && (
        <Space direction="vertical" orientation="vertical" style={{ width: '100%' }} size="middle">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="PDO Code">{pdo.production_order_code}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color="gold">{pdo.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Item Code">{pdo.item_code}</Descriptions.Item>
            <Descriptions.Item label="Handling Type">{pdo.handling_type}</Descriptions.Item>
            <Descriptions.Item label="Target Quantity">{Number(pdo.target_qty_mt).toLocaleString()} MT</Descriptions.Item>
            <Descriptions.Item label="Packaging">{pdo.target_packaging} ({pdo.target_unit_count} units)</Descriptions.Item>
            <Descriptions.Item label="Scheduled Date">{pdo.scheduled_start_date}</Descriptions.Item>
            <Descriptions.Item label="Shift">
              <Tag color={pdo.scheduled_shift === 'Morning' ? 'blue' : 'orange'}>
                {pdo.scheduled_shift || 'Morning'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Recipe Instructions" span={2}>
              {pdo.recipe_instructions || 'N/A'}
            </Descriptions.Item>
          </Descriptions>

          <div>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Select Workers:
            </span>
            {loadingWorkers ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spin size="small" />
              </div>
            ) : (
              <TreeSelect
                treeData={treeData}
                value={selectedWorkerIds}
                onChange={(val) => setSelectedWorkerIds(val)}
                treeCheckable={true}
                showCheckedStrategy={TreeSelect.SHOW_ALL}
                placeholder="Click to check and assign available floor staff"
                style={{ width: '100%' }}
                dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
                allowClear
              />
            )}
          </div>

          {selectedWorkerIds.length > 0 && (
            <Card size="small" title={`Assigned Team Preview (${selectedWorkerIds.length} Workers)`}>
              <Space wrap>
                {selectedWorkerIds.map((id) => {
                  const worker = availableWorkers.find((w) => w.worker_id === id);
                  return (
                    <Tag
                      key={id}
                      color="cyan"
                      icon={<CheckCircleOutlined />}
                      closable
                      onClose={() =>
                        setSelectedWorkerIds(selectedWorkerIds.filter((wId) => wId !== id))
                      }
                    >
                      {worker ? `${worker.first_name} ${worker.last_name}` : `ID: ${id}`}
                    </Tag>
                  );
                })}
              </Space>
            </Card>
          )}
        </Space>
      )}
    </Modal>
  );
}

export default PDOAssignWorkerModal;
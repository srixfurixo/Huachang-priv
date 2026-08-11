import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, message } from 'antd';
import axios from 'axios';

export default function EditUserModal({ open, onClose, user, onUserUpdated }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        roleName: user.role || 'Warehouse_Employee',
        isActive: user.is_active ?? true,
      });
    } else {
      form.resetFields();
    }
  }, [open, user, form]);

  const handleSubmit = async (values) => {
    if (!user || !user.id) return;
    setLoading(true);
    try {
      await axios.put(`/api/admin/${user.id}`, {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        role_name: values.roleName,
        is_active: values.isActive,
      });
      message.success('User updated successfully!');
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Edit Employee Account"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Save Changes"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="First Name"
          name="firstName"
          rules={[{ required: true, message: 'Please input the first name' }]}
        >
          <Input placeholder="e.g. Sarah" />
        </Form.Item>

        <Form.Item
          label="Last Name"
          name="lastName"
          rules={[{ required: true, message: 'Please input the last name' }]}
        >
          <Input placeholder="e.g. Lee" />
        </Form.Item>

        <Form.Item
          label="Company Email"
          name="email"
          rules={[
            { required: true, message: 'Please input the email' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input placeholder="sarah@huachang-growmax.com" />
        </Form.Item>

        <Form.Item
          label="System Access Role"
          name="roleName"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select placeholder="Select role">
            <Select.Option value="Admin">Admin</Select.Option>
            <Select.Option value="Manager">Manager</Select.Option>
            <Select.Option value="Warehouse_Supervisor">Warehouse Supervisor</Select.Option>
            <Select.Option value="Warehouse_Employee">Warehouse Employee</Select.Option>
            <Select.Option value="Delivery_Supervisor">Delivery Supervisor</Select.Option>
            <Select.Option value="Delivery_Driver">Delivery Driver</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Account Status"
          name="isActive"
          valuePropName="checked"
        >
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

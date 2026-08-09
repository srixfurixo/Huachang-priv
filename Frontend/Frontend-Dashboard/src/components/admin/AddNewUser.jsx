  import React, { useState } from 'react';
  import axios from 'axios';
  import { 
      Form,
      Modal,
      Input,
      Button,
      Select,
      message,
      Checkbox
  } from 'antd';


  function AddNewUser({ open, onClose, onUserAdded }) {
      const [form] = Form.useForm();
      const [loading, setLoading] = useState(false);

      const handleSubmit = async (values) => {
          setLoading(true);
          try {

          const response = await axios.post('http://localhost:5000/api/auth/register', {
          first_name: values.firstName,
          last_name: values.lastName,
          username: values.username,
          email: values.email,
          staff_id: values.staffId,
          role_id: values.roleId,
        });

          if (response.status === 201) {
              message.success('User added successfully!');
              form.resetFields();
              onUserAdded(response.data.generated_password, values.username);
              onClose();

          } 
          
      } catch (error) {
              console.error('Error adding user:', error);
              message.error('Failed to add user. Please try again.');
          } finally {
              setLoading(false);
          }
      };

      return (
        <Modal
        title="Create New Employee Account"
        open={open} // Variable passed down from parent page state
        onFinish={handleSubmit}
        onCancel={() => {
          form.resetFields();
          onClose(); // Triggers parent state to turn false
        }}
        confirmLoading={loading} // Shows loading wheel while database saves
        okText="Create Account"
        okButtonProps={{ htmlType: 'submit', form: 'add_user_form' }} 
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" name="add_user_form" onFinish={handleSubmit}>
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'Please input the first name' }]}
          >
            <Input placeholder="e.g. Sarah" />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Please input the last name' }]}
          >
            <Input placeholder="e.g. Lee" />
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input a unique username' }]}
          >
            <Input placeholder="e.g. slee26" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Company Email"
            rules={[
              { required: true, message: 'Please input the email' },
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input placeholder="sarah@huachang-growmax.com" />
          </Form.Item>

          <Form.Item
            name="staffId"
            label="Staff ID"
            rules={[{ required: true, message: 'Please input the unique Staff ID' }]}
          >
            <Input placeholder="e.g. HCGM-2026-042" />
          </Form.Item>

          <Form.Item
            name="roleId"
            label="System Access Role"
            rules={[{ required: true, message: 'Please select an operational role' }]}
          >
            <Select placeholder="Select role tier alignment" allowClear>
              <Select.Option value={1}>Admin</Select.Option>
              <Select.Option value={2}>Manager</Select.Option>
              <Select.Option value={3}>Warehouse Supervisor</Select.Option>
              <Select.Option value={4}>Warehouse Employee</Select.Option>
              <Select.Option value={5}>Delivery Supervisor</Select.Option>
              <Select.Option value={6}>Delivery Driver</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      );



  }

  export default AddNewUser;
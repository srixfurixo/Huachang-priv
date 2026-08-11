import React, { useState, useEffect } from 'react';
import { Table, Input, Tag, Space, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import '../../styles/usersTable.css';

const { Search } = Input;

function UsersTable({ users = [], loading = true, onEditUser }) {
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();

    const filtered = users.filter((user) => {
      const firstName = (user.first_name || '').toLowerCase();
      const lastName = (user.last_name || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role || '').toLowerCase();

      return (
        firstName.includes(value) ||
        lastName.includes(value) ||
        username.includes(value) ||
        email.includes(value) ||
        role.includes(value)
      );
    });

    setFilteredUsers(filtered);
  };

  const columns = [
    {
      title: 'First Name',
      dataIndex: 'first_name',
      key: 'first_name',
    },
    {
      title: 'Last Name',
      dataIndex: 'last_name',
      key: 'last_name',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'default';
        let displayRole = role;
        if (role === 'Admin') color = 'magenta';
        else if (role === 'Manager') color = 'geekblue';
        else if (role === 'Warehouse_Supervisor') {
          color = 'purple';
          displayRole = 'Warehouse Supervisor';
        } else if (role === 'Warehouse_Employee') {
          color = 'cyan';
          displayRole = 'Warehouse Employee';
        } else if (role === 'Delivery_Supervisor') {
          color = 'orange';
          displayRole = 'Delivery Supervisor';
        } else if (role === 'Delivery_Driver') {
          color = 'gold';
          displayRole = 'Delivery Driver';
        }

        return (
          <Tag color={color} key={role}>
            {displayRole ? displayRole : 'UNASSIGNED'}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => onEditUser && onEditUser(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', minHeight: '500px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Search
          placeholder="Search by name, username, email or role"
          allowClear
          onChange={handleSearch}
          style={{ width: '100%' }}
          size="large"
        />
        <Table
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Space>
    </div>
  );
}

export default UsersTable;
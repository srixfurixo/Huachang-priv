import React, {useState, useEffect} from 'react';
import {Table, Input, Tag, Space, message } from 'antd';
import '../../styles/usersTable.css';
import axios from 'axios';

const {Search} = Input;

function UsersTable({users = [], loading = true}) {
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Fetch the list of All users 
  // useEffect(() => {
    // const fetchUsers = async()=>{
    //   try{
    //     const response = await axios.get('http://localhost:5000/api/admin/retrieve_users'); // needs to be complete 
    //     // fixes added to handle the json return 
    //     const table_data = response.data.users;
    //     setUsers(table_data);
    //     setFilteredUsers(table_data);

    //   } catch (error){
    //     console.error('Error fetching users:', error);
    //     message.error('Failed to load user data.');
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    
    // fetchUsers();

    useEffect(() => {
      setFilteredUsers(users);
    }, [users]);

  // Search function with lower case safety net
  const handleSearch = (e) => {
    const value= e.target.value.toLowerCase();

    const filtered = users.filter((user) => {
      const firstName = (user.first_name || '').toLowerCase();
      const lastName = (user.last_name || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      // fixed wrong index used
      const role = (user.role || '').toLowerCase();

      return (
        firstName.includes(value) ||
        lastName.includes(value) ||
        username.includes(value) ||
        email.includes (value) ||
        role.includes(value)
      );
    });

    setFilteredUsers(filtered); // Redraw table with search list
  };

  // Set columns
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

    // fixed role data index and color tags as well
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {

        // color based on role
        let color = 'default';
        if (role === 'Admin') color = 'magenta';
        else if (role === 'Manager') color = 'geekblue';
        else if (role === 'Warehouse_Supervisor') { 
          color = 'purple'; 
          role = 'Warehouse Supervisor';
        }
        else if (role === 'Warehouse_Employee') { 
          color = 'cyan'; 
          role = 'Warehouse Employee';
        }
        else if (role === 'Delivery_Supervisor') { 
          color = 'orange'; 
          role = 'Delivery Supervisor';
        }
        else if (role === 'Delivery_Driver') { 
          color = 'gold'; 
          role = 'Delivery Driver';
        }

        return (
          <Tag color={color} key={role}>
            {role ? role : 'UNASSIGNED'}
          </Tag>
        );
      },
    },
  ];

  // Draw Table
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
          pagination={{ pageSize: 5 }}
        />
      </Space>
    </div>
  );
}

  export default UsersTable
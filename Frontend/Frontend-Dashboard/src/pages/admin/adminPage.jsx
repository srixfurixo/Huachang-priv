import { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Space, Row, Col, theme, App } from 'antd'
import {
	TeamOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	UserOutlined,
	ExportOutlined,
	PlusOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../components/layout/AppLayout'
import StatCard from '../../components/common/StatCard'
import AddNewUser from '../../components/admin/AddNewUser'
import PasswordUser from '../../components/admin/PasswordUser'
import EditUserModal from '../../components/admin/EditUserModal'
import UsersTable from '../../components/admin/UsersTable'

const { Title, Text } = Typography

function AdminPage() {
	const [isModalOpen, setIsModalOpen]             = useState(false)
	const [editModalOpen, setEditModalOpen]         = useState(false)
	const [selectedUser, setSelectedUser]           = useState(null)
	const [generatedPassword, setGeneratedPassword] = useState('')
	const [createdUsername, setCreatedUsername]     = useState('')
	const [showPasswordAlert, setShowPasswordAlert] = useState(false)
	const [users, setUsers]                         = useState([])
	const [usersLoading, setUsersLoading]           = useState(true)
	const { token } = theme.useToken()
	const { message } = App.useApp()

	const fetchUsers = useCallback(async () => {
		setUsersLoading(true)
		try {
			const res = await axios.get('/api/admin/retrieve_users')
			setUsers(res.data.users ?? [])
		} catch {
			message.error('Failed to load user data.')
		} finally {
			setUsersLoading(false)
		}
	}, [])

	useEffect(() => { fetchUsers() }, [fetchUsers])

	const handleEditUser = (user) => {
		setSelectedUser(user)
		setEditModalOpen(true)
	}

	const totalUsers    = users.length
	const activeUsers   = users.filter((u) => u.is_active).length
	const inactiveUsers = users.filter((u) => !u.is_active).length
	const adminUsers    = users.filter((u) => u.role === 'Admin').length
	const uniqueRoles   = new Set(users.map((u) => u.role).filter(Boolean)).size

	return (
		<AppLayout breadcrumbs={['Administration', 'User Management']}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					marginBottom: 24,
				}}
			>
				<div>
					<Title
						level={2}
						style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}
					>
						User Management
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Manage system access, roles, and user profiles across all departments.
					</Text>
				</div>

				<Space>
					<Button icon={<ExportOutlined />}>
						Export
					</Button>
					<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
						Add User
					</Button>
				</Space>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<TeamOutlined />}
						label="Total Users"
						value={usersLoading ? '—' : totalUsers}
						subtitle={usersLoading ? '' : `${uniqueRoles} role${uniqueRoles !== 1 ? 's' : ''} assigned`}
						iconBg={`${token.colorPrimary}18`}
						iconColor={token.colorPrimary}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<CheckCircleOutlined />}
						label="Active Users"
						value={usersLoading ? '—' : activeUsers}
						subtitle={
							usersLoading || totalUsers === 0
								? ''
								: `${Math.round((activeUsers / totalUsers) * 100)}% of total workforce`
						}
						iconBg={`${token.colorSuccess}18`}
						iconColor={token.colorSuccess}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<CloseCircleOutlined />}
						label="Inactive Accounts"
						value={usersLoading ? '—' : inactiveUsers}
						subtitle="Pending review"
						alert={!usersLoading && inactiveUsers > 0 ? `${inactiveUsers} inactive` : undefined}
						iconBg={`${token.colorError}12`}
						iconColor={token.colorError}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<UserOutlined />}
						label="Admin Accounts"
						value={usersLoading ? '—' : adminUsers}
						subtitle="Full system access accounts"
						iconBg={`${token.colorInfo}18`}
						iconColor={token.colorInfo}
					/>
				</Col>
			</Row>

			<UsersTable users={users} loading={usersLoading} onEditUser={handleEditUser} />

			<AddNewUser
				open={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onUserAdded={(password, username) => {
					setGeneratedPassword(password)
					setCreatedUsername(username)
					setShowPasswordAlert(true)
					fetchUsers()
				}}
			/>

			<EditUserModal
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				user={selectedUser}
				onUserUpdated={fetchUsers}
			/>

			<PasswordUser
				open={showPasswordAlert}
				onClose={() => setShowPasswordAlert(false)}
				username={createdUsername}
				password={generatedPassword}
			/>
		</AppLayout>
	)
}

export default AdminPage

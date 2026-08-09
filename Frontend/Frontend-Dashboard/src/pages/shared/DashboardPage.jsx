import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Typography, theme } from 'antd'
import AppLayout from '../../components/layout/AppLayout'
import { UserContext } from '../../global/UserContext'

const { Title, Text } = Typography

function DashboardPage() {
	const { user, logout } = useContext(UserContext)
	const navigate = useNavigate()
	const { token } = theme.useToken()

	const handleLogout = async () => {
		await logout()
		navigate('/auth/login', { replace: true })
	}

	return (
		<AppLayout breadcrumbs={['Dashboard']}>
			<div
				style={{
					minHeight: 'calc(100vh - 160px)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Card
					style={{
						width: '100%',
						maxWidth: 680,
						borderRadius: token.borderRadiusLG,
				}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 16,
						}}
					>
						<div>
							<Title level={2} style={{ marginBottom: 8 }}>
								Dashboard
							</Title>
							<Text type="secondary">
								Welcome back, {user?.first_name || user?.username || 'User'}.
							</Text>
						</div>
						<Button type="primary" onClick={handleLogout}>
							Log out
						</Button>
					</div>

					<div style={{ marginTop: 28 }}>
						<Text strong>Current role</Text>
						<div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
							<Text>{user?.role || 'Unknown'}</Text>
						</div>
					</div>
				</Card>
			</div>
		</AppLayout>
	)
}

export default DashboardPage

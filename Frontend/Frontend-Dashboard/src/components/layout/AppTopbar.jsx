import { useMemo, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Layout,
	Space,
	Avatar,
	Typography,
	Breadcrumb,
	Button,
	Badge,
	Tooltip,
	Switch,
	Dropdown,
	theme,
} from 'antd'
import {
	BellOutlined,
	SunOutlined,
	MoonOutlined,
	LogoutOutlined,
	UserOutlined,
} from '@ant-design/icons'
import { useAppTheme } from '../../context/ThemeContext'
import { UserContext } from '../../global/UserContext'

const { Header } = Layout
const { Text } = Typography

function buildTopbarUser(user) {
	if (!user) return { initials: 'G', displayName: 'Guest', role: '' }
	const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
	const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
	return {
		initials: initials || 'U',
		displayName: fullName || user.username || 'User',
		role: (user.role || '').replace(/_/g, ' '),
	}
}

function AppTopbar({ breadcrumbs = [] }) {
	const { isDark, toggle } = useAppTheme()
	const { token } = theme.useToken()
	const { user: authUser, logout } = useContext(UserContext)
	const navigate = useNavigate()
	const user = useMemo(() => buildTopbarUser(authUser), [authUser])

	const userMenuItems = [
		{
			key: 'profile',
			icon: <UserOutlined />,
			label: (
				<span>
					<strong>{user.displayName}</strong>
					<br />
					<small style={{ color: token.colorTextTertiary }}>{user.role}</small>
				</span>
			),
			disabled: true,
		},
		{ type: 'divider' },
		{
			key: 'logout',
			icon: <LogoutOutlined />,
			label: 'Sign Out',
			danger: true,
			onClick: async () => {
				await logout()
				navigate('/auth/login', { replace: true })
			},
		},
	]

	const now = new Date().toLocaleTimeString('en-MY', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
		timeZone: 'Asia/Kuala_Lumpur',
	})

	return (
		<Header
			style={{
				position: 'sticky',
				top: 0,
				zIndex: 100,
				background: token.colorBgContainer,
				borderBottom: `1px solid ${token.colorBorderSecondary}`,
				padding: '0 24px',
				height: 64,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
			}}
		>
			<Space size={16} align="center">
				{breadcrumbs.length > 0 && (
					<Breadcrumb
						items={[
							{
								title: (
									<Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
										Huachang Growmax WMS
									</Text>
								),
							},
							...breadcrumbs.map((b, i) => ({
								title: (
									<Text
										style={{
											fontSize: 12,
											color:
												i === breadcrumbs.length - 1
													? token.colorTextHeading
													: token.colorTextTertiary,
											fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
										}}
									>
										{b}
									</Text>
								),
							})),
						]}
					/>
				)}
			</Space>

			<Space size={8} align="center">
				<Text style={{ fontSize: 11, color: token.colorTextQuaternary, marginRight: 4 }}>
					Last synced: {now} CST
				</Text>

				<Tooltip title="Notifications">
					<Badge count={0} size="small">
						<Button
							type="text"
							icon={<BellOutlined style={{ fontSize: 16 }} />}
							style={{ color: token.colorTextSecondary }}
						/>
					</Badge>
				</Tooltip>

				<Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
					<Space size={6} align="center">
						<SunOutlined
							style={{
								fontSize: 13,
								color: isDark ? token.colorTextQuaternary : token.colorWarning,
							}}
						/>
						<Switch
							size="small"
							checked={isDark}
							onChange={toggle}
							style={{ background: isDark ? token.colorPrimary : '#d9d9d9' }}
						/>
						<MoonOutlined
							style={{
								fontSize: 13,
								color: isDark ? token.colorInfo : token.colorTextQuaternary,
							}}
						/>
					</Space>
				</Tooltip>

				<Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
					<Avatar
						size={34}
						style={{
							background: token.colorPrimary,
							fontSize: 12,
							fontWeight: 700,
							cursor: 'pointer',
							marginLeft: 4,
						}}
					>
						{user.initials}
					</Avatar>
				</Dropdown>
			</Space>
		</Header>
	)
}

export default AppTopbar

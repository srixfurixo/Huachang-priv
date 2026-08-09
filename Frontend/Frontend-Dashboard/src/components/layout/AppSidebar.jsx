import { useMemo, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Typography, Button, Tooltip, theme } from 'antd'
import {
	DashboardOutlined,
	InboxOutlined,
	ApartmentOutlined,
	UnorderedListOutlined,
	FileTextOutlined,
	ContainerOutlined,
	SwapOutlined,
	EyeOutlined,
	CheckCircleOutlined,
	BarChartOutlined,
	ImportOutlined,
	CarryOutOutlined,
	FormOutlined,
	SendOutlined,
	EnvironmentOutlined,
	HistoryOutlined,
	FlagOutlined,
	WarningOutlined,
	TeamOutlined,
	FileSearchOutlined,
	SettingOutlined,
	AlertOutlined,
	MenuFoldOutlined,
} from '@ant-design/icons'
import { navyPalette } from '../../theme/antdTheme'
import { useAppTheme } from '../../context/ThemeContext'
import { UserContext } from '../../global/UserContext'
import { getVisibleNavItems, getSelectedNavKey } from '../../config/navConfig'
import logoLight from '../../assets/images/logos/logo.svg'
import logoDark from '../../assets/images/logos/logo-dark.png'

const { Sider } = Layout
const { Text } = Typography

const NAV_ICONS = {
	'/operations/overview': <DashboardOutlined />,
	'/operations/inventory': <InboxOutlined />,
	'/operations/dispatch': <ApartmentOutlined />,
	'/operations/purchase-orders': <FileTextOutlined />,
	'/operations/collection': <ContainerOutlined />,
	'/operations/intake-log': <SwapOutlined />,
	'/warehouse/tasks': <UnorderedListOutlined />,
	'/warehouse/inventory': <EyeOutlined />,
	'/warehouse/intake-review': <CheckCircleOutlined />,
	'/warehouse/analytics': <BarChartOutlined />,
	'/warehouse/intake': <ImportOutlined />,
	'/warehouse/my-tasks': <CarryOutOutlined />,
	'/warehouse/progress': <FormOutlined />,
	'/logistics/dispatch': <SendOutlined />,
	'/logistics/transit': <EnvironmentOutlined />,
	'/logistics/history': <HistoryOutlined />,
	'/logistics/my-route': <EnvironmentOutlined />,
	'/logistics/status': <FlagOutlined />,
	'/logistics/incidents': <WarningOutlined />,
	'/admin/users': <TeamOutlined />,
	'/admin/audit-logs': <FileSearchOutlined />,
	'/admin/settings': <SettingOutlined />,
	'/admin/corrections': <AlertOutlined />,
}

function buildUserDisplay(user) {
	if (!user) return { role: null, username: 'Guest', initials: 'G', jobTitle: '' }
	const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
	const initials = fullName
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
	return {
		role: user.role || null,
		username: fullName || user.username || 'User',
		initials: initials || 'U',
		jobTitle: (user.role || '').replace(/_/g, ' ') || 'System User',
	}
}

function AppSidebar({ collapsed, onExpand, onCollapse }) {
	const navigate = useNavigate()
	const location = useLocation()
	const { token } = theme.useToken()
	const { isDark } = useAppTheme()
	const { user: authUser } = useContext(UserContext)
	const user = useMemo(() => buildUserDisplay(authUser), [authUser])

	const logo = isDark ? logoDark : logoLight
	const sidebarBg = isDark ? navyPalette[9] : token.colorBgContainer
	const sidebarBorder = isDark ? 'rgba(255,255,255,0.08)' : token.colorBorderSecondary
	const sidebarHover = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
	const brandColor = isDark ? '#ffffff' : token.colorText
	const subtitleColor = isDark ? 'rgba(255,255,255,0.72)' : token.colorTextTertiary
	const sectionColor = isDark ? 'rgba(255,255,255,0.55)' : token.colorTextQuaternary
	const menuTheme = isDark ? 'dark' : 'light'
	const iconColor = isDark ? 'rgba(255,255,255,0.65)' : token.colorTextSecondary

	const visibleItems = useMemo(
		() => getVisibleNavItems(user.role),
		[user.role],
	)

	const selectedKey = getSelectedNavKey(location.pathname, visibleItems)

	const menuItems = useMemo(() => {
		const items = []
		let currentSection = null

		for (const item of visibleItems) {
			if (item.section !== currentSection) {
				currentSection = item.section
				items.push({
					type: 'group',
					label: (
						<Text
							style={{
								fontSize: 10,
								fontWeight: 600,
								letterSpacing: '0.6px',
								textTransform: 'uppercase',
								color: sectionColor,
							}}
						>
							{item.section}
						</Text>
					),
				})
			}
			items.push({
				key: item.key,
				icon: NAV_ICONS[item.key],
				label: item.label,
				onClick: () => navigate(item.key),
			})
		}
		return items
	}, [visibleItems, navigate, sectionColor])

	return (
		<Sider
			collapsible
			collapsed={collapsed}
			onCollapse={(value) => (value ? onCollapse() : onExpand())}
			trigger={null}
			width={240}
			collapsedWidth={72}
			style={{
				background: sidebarBg,
				borderRight: `1px solid ${sidebarBorder}`,
				overflow: 'hidden',
				height: '100vh',
				position: 'fixed',
				insetInlineStart: 0,
				top: 0,
				bottom: 0,
				scrollbarWidth: 'none',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					height: '100%',
					overflow: 'hidden',
				}}
			>
			<div
				style={{
					flexShrink: 0,
					padding: collapsed ? '20px 16px' : '16px 20px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 8,
					minHeight: 64,
					borderBottom: `1px solid ${sidebarBorder}`,
				}}
			>
				<div
					onClick={collapsed ? onExpand : undefined}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						flex: collapsed ? 1 : 'initial',
						justifyContent: collapsed ? 'center' : 'flex-start',
						cursor: collapsed ? 'pointer' : 'default',
						userSelect: 'none',
						borderRadius: 6,
						padding: collapsed ? '4px' : 0,
						transition: 'background 0.15s',
					}}
					onMouseEnter={(e) => {
						if (collapsed) e.currentTarget.style.background = sidebarHover
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = 'transparent'
					}}
				>
					<img
						src={logo}
						alt="Huachang Growmax"
						style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
					/>
					{!collapsed && (
						<div>
							<Text
								style={{
									color: brandColor,
									fontSize: 13,
									fontWeight: 700,
									letterSpacing: '0.5px',
									display: 'block',
									lineHeight: 1.2,
								}}
							>
								HUACHANG
							</Text>
							<Text style={{ color: subtitleColor, fontSize: 10 }}>
								Growmax WMS
							</Text>
						</div>
					)}
				</div>

				{!collapsed && (
					<Tooltip title="Collapse sidebar">
						<Button
							type="text"
							size="small"
							icon={<MenuFoldOutlined />}
							onClick={onCollapse}
							style={{ color: iconColor, flexShrink: 0 }}
							aria-label="Collapse sidebar"
						/>
					</Tooltip>
				)}
			</div>

			<div
				style={{
					flex: 1,
					minHeight: 0,
					overflowY: 'auto',
					overflowX: 'hidden',
					scrollbarWidth: 'thin',
				}}
			>
				<Menu
					theme={menuTheme}
					mode="inline"
					selectedKeys={[selectedKey]}
					items={menuItems}
					style={{
						background: 'transparent',
						border: 'none',
						marginTop: 8,
					}}
				/>
			</div>

			{!collapsed && (
				<div
					style={{
						flexShrink: 0,
						padding: '12px 16px',
						borderTop: `1px solid ${sidebarBorder}`,
						background: sidebarBg,
						display: 'flex',
						alignItems: 'center',
						gap: 10,
					}}
				>
					<Avatar
						size={36}
						style={{
							background: isDark ? '#049DD9' : token.colorInfo,
							color: '#fff',
							fontSize: 13,
							fontWeight: 700,
							flexShrink: 0,
						}}
					>
						{user.initials}
					</Avatar>
					<div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
						<Text
							ellipsis
							style={{ color: brandColor, fontSize: 13, fontWeight: 600, display: 'block' }}
						>
							{user.username}
						</Text>
						<Text
							ellipsis
							style={{ color: subtitleColor, fontSize: 11, display: 'block' }}
						>
							{user.jobTitle}
						</Text>
					</div>
				</div>
			)}
			</div>
		</Sider>
	)
}

export default AppSidebar

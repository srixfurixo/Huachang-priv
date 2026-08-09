import { useState, useContext } from 'react'
import { Layout, theme } from 'antd'
import AppSidebar from './AppSidebar'
import AppTopbar from './AppTopbar'
import { UserContext } from '../../global/UserContext'
import { getLayoutVariant } from '../../config/navConfig'

const { Content } = Layout

/**
 * AppLayout — shared shell for all authenticated pages.
 * Field roles (warehouse staff, drivers) get touch-friendly spacing via layout-field.
 */
function AppLayout({ children, breadcrumbs = [] }) {
	const [collapsed, setCollapsed] = useState(false)
	const { token } = theme.useToken()
	const { user } = useContext(UserContext)
	const layoutVariant = getLayoutVariant(user?.role)

	const siderWidth = collapsed ? 72 : 240

	return (
		<Layout className={`app-layout app-layout--${layoutVariant}`} style={{ minHeight: '100vh' }}>
			<AppSidebar
				collapsed={collapsed}
				onExpand={() => setCollapsed(false)}
				onCollapse={() => setCollapsed(true)}
			/>

			<Layout
				style={{
					marginInlineStart: siderWidth,
					transition: 'margin-inline-start 0.2s, background 0.2s',
					background: token.colorBgLayout,
				}}
			>
				<AppTopbar breadcrumbs={breadcrumbs} />

				<Content
					style={{
						padding: layoutVariant === 'field' ? '20px 16px' : 32,
						minHeight: 'calc(100vh - 64px)',
						background: token.colorBgLayout,
					}}
				>
					{children}
				</Content>
			</Layout>
		</Layout>
	)
}

export default AppLayout

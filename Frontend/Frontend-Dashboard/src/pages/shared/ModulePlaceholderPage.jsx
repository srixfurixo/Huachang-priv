import { Typography, Tag, theme } from 'antd'
import { ToolOutlined } from '@ant-design/icons'
import AppLayout from '../../components/layout/AppLayout'
import { getNavItemByPath } from '../../config/navConfig'

const { Title, Text, Paragraph } = Typography

function ModulePlaceholderPage({ pathname }) {
	const { token } = theme.useToken()
	const navItem = getNavItemByPath(pathname)

	if (!navItem) {
		return (
			<AppLayout breadcrumbs={['Page Not Found']}>
				<Title level={3}>Page not found</Title>
			</AppLayout>
		)
	}

	const sectionLabel = navItem.section.replace(/_/g, ' ')

	return (
		<AppLayout breadcrumbs={[sectionLabel, navItem.label]}>
			<div
				style={{
					background: token.colorBgContainer,
					borderRadius: token.borderRadiusLG,
					padding: 32,
					maxWidth: 720,
				}}
			>
				<Tag color="processing" style={{ marginBottom: 16 }}>
					Sprint placeholder
				</Tag>
				<Title level={2} style={{ marginTop: 0 }}>
					{navItem.label}
				</Title>
				<Paragraph style={{ color: token.colorTextSecondary, fontSize: 15 }}>
					{navItem.description}
				</Paragraph>
				<div
					style={{
						marginTop: 24,
						padding: 20,
						borderRadius: token.borderRadius,
						background: token.colorFillAlter,
						display: 'flex',
						alignItems: 'center',
						gap: 12,
					}}
				>
					<ToolOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
					<Text type="secondary">
						This module shell is wired into navigation and role access. Business logic
						will be implemented in a future sprint.
					</Text>
				</div>
			</div>
		</AppLayout>
	)
}

export default ModulePlaceholderPage

import { Card, Typography, theme } from 'antd'

const { Text, Title } = Typography

/**
 * StatCard — reusable KPI card for dashboard stat displays (Figma node 362:1536)
 */
function StatCard({ icon, label, value, subtitle, iconBg, iconColor, alert }) {
	const { token } = theme.useToken()

	return (
		<Card
			variant="outlined"
			style={{
				borderRadius: token.borderRadiusLG || 12,
				border: `1px solid ${token.colorBorderSecondary}`,
				boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
				height: '100%',
				width: '100%',
			}}
			styles={{ body: { padding: '20px 24px' } }}
		>
			<div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
				<div
					style={{
						width: 44,
						height: 44,
						borderRadius: '50%',
						background: iconBg || `${token.colorPrimary}18`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<span style={{ fontSize: 20, color: iconColor || token.colorPrimary, display: 'flex' }}>
						{icon}
					</span>
				</div>

				<div style={{ minWidth: 0 }}>
					<Text style={{ fontSize: 13, color: token.colorTextSecondary, display: 'block', marginBottom: 4 }}>
						{label}
					</Text>
					<Title
						level={2}
						style={{
							margin: 0,
							fontSize: 32,
							fontWeight: 700,
							color: token.colorTextHeading,
							lineHeight: 1.1,
						}}
					>
						{value}
					</Title>
					{subtitle && (
						<Text style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4, display: 'block' }}>
							{subtitle}
						</Text>
					)}
					{alert && (
						<Text
							style={{
								fontSize: 12,
								color: token.colorError,
								fontWeight: 600,
								marginTop: 4,
								display: 'block',
							}}
						>
							{alert}
						</Text>
					)}
				</div>
			</div>
		</Card>
	)
}

export default StatCard

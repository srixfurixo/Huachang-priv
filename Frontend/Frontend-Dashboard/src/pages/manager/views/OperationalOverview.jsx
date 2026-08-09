import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Row, Col, Card, Button, theme, App } from 'antd'
import {
	FileTextOutlined,
	InboxOutlined,
	WarningOutlined,
	CloseCircleOutlined,
	ArrowRightOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'

const { Title, Text } = Typography

function OperationalOverview() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const navigate = useNavigate()
	const [alerts, setAlerts] = useState([])
	const [loadingAlerts, setLoadingAlerts] = useState(true)

	useEffect(() => {
		const fetchAlerts = async () => {
			setLoadingAlerts(true)
			try {
				const res = await axios.get('/api/inventory/alerts/low-stock')
				setAlerts(res.data.alerts ?? [])
			} catch {
				message.error('Failed to load inventory alerts.')
			} finally {
				setLoadingAlerts(false)
			}
		}
		fetchAlerts()
	}, [message])

	const { lowStock, outOfStock } = useMemo(() => {
		let low = 0
		let out = 0
		for (const alert of alerts) {
			if (alert.alert_type === 'Out of Stock') out += 1
			else low += 1
		}
		return { lowStock: low, outOfStock: out }
	}, [alerts])

	const openPOs = 4
	const incomingBatches = 7

	const quickLinks = [
		{
			label: 'Purchase Orders & SO',
			description: 'Raise new orders and track supplier responses.',
			path: '/operations/purchase-orders',
		},
		{
			label: 'Collection Advice',
			description: 'Match incoming delivery batches to open POs.',
			path: '/operations/collection',
		},
		{
			label: 'Intake / Outgoing Log',
			description: 'Review material movements entered by floor staff.',
			path: '/operations/intake-log',
		},
		{
			label: 'Inventory Overview',
			description: 'Check live stock across all storage locations.',
			path: '/operations/inventory',
		},
	]

	return (
		<AppLayout breadcrumbs={['Operations', 'Operational Overview']}>
			<div style={{ marginBottom: 24 }}>
				<Title
					level={2}
					style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}
				>
					Operational Overview
				</Title>
				<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
					Procurement, incoming batches, and stock health at a glance.
				</Text>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<FileTextOutlined />}
						label="Open Purchase Orders"
						value={openPOs}
						subtitle="Awaiting full fulfilment"
						iconBg={`${token.colorPrimary}18`}
						iconColor={token.colorPrimary}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<InboxOutlined />}
						label="Incoming Batches"
						value={incomingBatches}
						subtitle="Expected against open POs"
						iconBg={`${token.colorInfo}18`}
						iconColor={token.colorInfo}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<WarningOutlined />}
						label="Low Stock Items"
						value={loadingAlerts ? '-' : lowStock}
						subtitle="At or below threshold"
						alert={!loadingAlerts && lowStock > 0 ? `${lowStock} need restock` : undefined}
						iconBg={`${token.colorWarning}18`}
						iconColor={token.colorWarning}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<CloseCircleOutlined />}
						label="Out of Stock"
						value={loadingAlerts ? '-' : outOfStock}
						subtitle="Zero quantity on hand"
						alert={!loadingAlerts && outOfStock > 0 ? `${outOfStock} depleted` : undefined}
						iconBg={`${token.colorError}12`}
						iconColor={token.colorError}
					/>
				</Col>
			</Row>

			<Row gutter={[16, 16]}>
				{quickLinks.map((link) => (
					<Col xs={24} sm={12} xl={6} key={link.path} style={{ display: 'flex' }}>
						<Card
							hoverable
							style={{
								width: '100%',
								borderRadius: token.borderRadiusLG,
								border: `1px solid ${token.colorBorderSecondary}`,
							}}
							styles={{ body: { padding: 20 } }}
							onClick={() => navigate(link.path)}
						>
							<Text strong style={{ fontSize: 15, color: token.colorTextHeading }}>
								{link.label}
							</Text>
							<Text
								style={{
									display: 'block',
									marginTop: 6,
									marginBottom: 16,
									fontSize: 13,
									color: token.colorTextSecondary,
								}}
							>
								{link.description}
							</Text>
							<Button type="link" style={{ padding: 0 }}>
								Open <ArrowRightOutlined />
							</Button>
						</Card>
					</Col>
				))}
			</Row>
		</AppLayout>
	)
}

export default OperationalOverview

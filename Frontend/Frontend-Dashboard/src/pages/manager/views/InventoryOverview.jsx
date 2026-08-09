import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Table, Tag, Space, Row, Col, Button, Tooltip, theme, App } from 'antd'
import {
	DatabaseOutlined,
	HomeOutlined,
	CloudServerOutlined,
	WarningOutlined,
	ExportOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'

const { Title, Text } = Typography
const { Search } = Input

const STALE_DAYS = 14

function daysSince(dateStr) {
	if (!dateStr) return Infinity
	return Math.round((new Date() - new Date(dateStr)) / 86400000)
}

function InventoryLevel() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState('')

	useEffect(() => {
		const fetchInventory = async () => {
			setLoading(true)
			try {
				const res = await axios.get('/api/inventory/overview')
				setItems(res.data.items ?? [])
			} catch {
				message.error('Failed to load inventory data.')
			} finally {
				setLoading(false)
			}
		}
		fetchInventory()
	}, [message])

	const rows = useMemo(
		() =>
			items.map((item) => {
				const quantity = Number(item.quantity_mt) || 0
				const locationType = item.location_type || 'External'
				const source = item.source || (locationType === 'Internal' ? 'Live' : 'Reported')
				return {
					...item,
					quantity_mt: quantity,
					description: item.description || item.item_code,
					location_type: locationType,
					source,
					_stale: source === 'Reported' && daysSince(item.last_verified) > STALE_DAYS,
				}
			}),
		[items],
	)

	const filteredRows = useMemo(() => {
		const value = searchText.trim().toLowerCase()
		if (!value) return rows
		return rows.filter((item) =>
			[item.item_code, item.description, item.location]
				.map((f) => (f || '').toLowerCase())
				.some((f) => f.includes(value)),
		)
	}, [rows, searchText])

	const totalOnHand = rows.reduce((s, r) => s + (Number(r.quantity_mt) || 0), 0)
	const internalMt = rows
		.filter((r) => r.location_type === 'Internal')
		.reduce((s, r) => s + (Number(r.quantity_mt) || 0), 0)
	const externalMt = rows
		.filter((r) => r.location_type === 'External')
		.reduce((s, r) => s + (Number(r.quantity_mt) || 0), 0)
	const staleCount = rows.filter((r) => r._stale).length

	const columns = [
		{
			title: 'Item Code',
			dataIndex: 'item_code',
			key: 'item_code',
			render: (code) => <Text strong>{code}</Text>,
		},
		{
			title: 'Description',
			dataIndex: 'description',
			key: 'description',
		},
		{
			title: 'On Hand',
			dataIndex: 'quantity_mt',
			key: 'quantity_mt',
			align: 'right',
			sorter: (a, b) => a.quantity_mt - b.quantity_mt,
			render: (qty) => `${Number(qty).toLocaleString()} MT`,
		},
		{
			title: 'Location',
			dataIndex: 'location',
			key: 'location',
		},
		{
			title: 'Type',
			dataIndex: 'location_type',
			key: 'location_type',
			filters: [
				{ text: 'Internal', value: 'Internal' },
				{ text: 'External', value: 'External' },
			],
			onFilter: (value, record) => record.location_type === value,
			render: (type) => (
				<Tag color={type === 'Internal' ? 'green' : 'default'}>{type}</Tag>
			),
		},
		{
			title: 'Stock Source',
			key: 'source',
			render: (_, record) => {
				if (record.source === 'Live') {
					return <Tag color="green">Live</Tag>
				}
				return (
					<Tooltip title={`Last verified ${record.last_verified || 'unknown'} (${daysSince(record.last_verified)} days ago)`}>
						<Tag color={record._stale ? 'red' : 'gold'}>
							{record._stale ? 'Reported - Stale' : 'Reported'}
						</Tag>
					</Tooltip>
				)
			},
		},
		{
			title: 'Last Verified',
			dataIndex: 'last_verified',
			key: 'last_verified',
			render: (date) => date || <Text type="secondary">-</Text>,
		},
	]

	return (
		<AppLayout breadcrumbs={['Operations', 'Inventory Level']}>
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
						Inventory Level
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Stock by item and location. Internal stock is live; external warehouse stock is
						reported and may lag 1-2 weeks.
					</Text>
				</div>

				<Button
					icon={<ExportOutlined />}
					style={{ borderColor: token.colorPrimary, color: token.colorPrimary }}
				>
					Export
				</Button>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<DatabaseOutlined />}
						label="Total On Hand"
						value={loading ? '-' : `${totalOnHand.toLocaleString()} MT`}
						subtitle="Across all warehouses"
						iconBg={`${token.colorPrimary}18`}
						iconColor={token.colorPrimary}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<HomeOutlined />}
						label="Internal (Live)"
						value={loading ? '-' : `${internalMt.toLocaleString()} MT`}
						subtitle="Internal locations"
						iconBg={`${token.colorSuccess}18`}
						iconColor={token.colorSuccess}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<CloudServerOutlined />}
						label="External (Reported)"
						value={loading ? '-' : `${externalMt.toLocaleString()} MT`}
						subtitle="Third-party warehouses"
						iconBg={`${token.colorInfo}18`}
						iconColor={token.colorInfo}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<WarningOutlined />}
						label="Stale Reports"
						value={loading ? '-' : staleCount}
						subtitle={`Not verified in ${STALE_DAYS}+ days`}
						alert={!loading && staleCount > 0 ? `${staleCount} need re-check` : undefined}
						iconBg={`${token.colorWarning}18`}
						iconColor={token.colorWarning}
					/>
				</Col>
			</Row>

			<div
				style={{
					background: token.colorBgContainer,
					padding: 24,
					borderRadius: token.borderRadiusLG,
					border: `1px solid ${token.colorBorderSecondary}`,
				}}
			>
				<Space direction="vertical" style={{ width: '100%' }} size="large">
					<Search
						placeholder="Search by item code, description, or location"
						allowClear
						onChange={(e) => setSearchText(e.target.value)}
						style={{ width: '100%' }}
						size="large"
					/>
					<Table
						columns={columns}
						dataSource={filteredRows}
						loading={loading}
						rowKey={(record) => `${record.location}-${record.item_code}`}
						pagination={{ pageSize: 8 }}
					/>
				</Space>
			</div>
		</AppLayout>
	)
}

export default InventoryLevel

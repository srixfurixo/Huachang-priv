import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Table, Tag, Space, Row, Col, Segmented, DatePicker, theme, App } from 'antd'
import {
	SwapOutlined,
	LoginOutlined,
	LogoutOutlined,
	ToolOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'

const { Title, Text } = Typography
const { Search } = Input

const TYPE_COLOR = {
	Intake: 'green',
	'Production Consumed': 'orange',
	'Production Output': 'geekblue',
	'Delivery Out': 'volcano',
}

const FILTERS = ['All', 'Intake', 'Production', 'Delivery Out']

function matchesFilter(type, filter) {
	if (filter === 'All') return true
	if (filter === 'Production') return type.startsWith('Production')
	return type === filter
}

function IntakeLog() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const [entries, setEntries] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState('')
	const [typeFilter, setTypeFilter] = useState('All')
	const [dateRange, setDateRange] = useState(null)

	useEffect(() => {
		const fetchLog = async () => {
			setLoading(true)
			try {
				const params = {}
				if (dateRange && dateRange[0] && dateRange[1]) {
					params.startDate = dateRange[0].format('YYYY-MM-DD')
					params.endDate = dateRange[1].format('YYYY-MM-DD')
				}
				const res = await axios.get('/api/inventory/movements', { params })
				setEntries(res.data.entries ?? [])
			} catch {
				message.error('Failed to load intake / outtake log.')
			} finally {
				setLoading(false)
			}
		}
		fetchLog()
	}, [message, dateRange])

	const normalizedEntries = useMemo(
		() =>
			entries.map((entry) => ({
				...entry,
				quantity_mt: Number(entry.quantity_mt) || 0,
			})),
		[entries],
	)

	const filteredEntries = useMemo(() => {
		const value = searchText.trim().toLowerCase()
		return normalizedEntries.filter((entry) => {
			if (!matchesFilter(entry.movement_type, typeFilter)) return false
			if (!value) return true
			return [entry.item_code, entry.reference, entry.logged_by, entry.location]
				.map((f) => (f || '').toLowerCase())
				.some((f) => f.includes(value))
		})
	}, [normalizedEntries, searchText, typeFilter])

	const totalMoves = normalizedEntries.length
	const intakeMt = normalizedEntries
		.filter((e) => e.movement_type === 'Intake')
		.reduce((s, e) => s + e.quantity_mt, 0)
	const deliveryMt = normalizedEntries
		.filter((e) => e.movement_type === 'Delivery Out')
		.reduce((s, e) => s + e.quantity_mt, 0)
	const productionMoves = normalizedEntries.filter((e) => e.movement_type.startsWith('Production')).length

	const columns = [
		{
			title: 'Timestamp',
			dataIndex: 'timestamp',
			key: 'timestamp',
			sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
			defaultSortOrder: 'descend',
		},
		{
			title: 'Movement',
			dataIndex: 'movement_type',
			key: 'movement_type',
			render: (type) => <Tag color={TYPE_COLOR[type] || 'default'}>{type}</Tag>,
		},
		{
			title: 'Item',
			dataIndex: 'item_code',
			key: 'item_code',
			render: (code) => <Text strong style={{ fontSize: 13 }}>{code}</Text>,
		},
		{
			title: 'Quantity',
			dataIndex: 'quantity_mt',
			key: 'quantity_mt',
			align: 'right',
			render: (qty) => `${Number(qty).toLocaleString()} MT`,
		},
		{
			title: 'Reference',
			dataIndex: 'reference',
			key: 'reference',
			render: (ref) => <Text strong style={{ fontSize: 13 }}>{ref}</Text>,
		},
		{
			title: 'Location',
			dataIndex: 'location',
			key: 'location',
		},
		{
			title: 'Logged By',
			dataIndex: 'logged_by',
			key: 'logged_by',
		},
	]

	return (
		<AppLayout breadcrumbs={['Operations', 'Intake / Outtake Log']}>
			<div style={{ marginBottom: 24 }}>
				<Title
					level={2}
					style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}
				>
					Intake / Outtake Log
				</Title>
				<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
					Read-only feed of stock movements from the real inventory movement ledger.
				</Text>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<SwapOutlined />}
						label="Total Movements"
						value={loading ? '-' : totalMoves}
						subtitle="All logged entries"
						iconBg={`${token.colorPrimary}18`}
						iconColor={token.colorPrimary}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<LoginOutlined />}
						label="Intake"
						value={loading ? '-' : `${intakeMt.toLocaleString()} MT`}
						subtitle="Collected in"
						iconBg={`${token.colorSuccess}18`}
						iconColor={token.colorSuccess}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<LogoutOutlined />}
						label="Delivered Out"
						value={loading ? '-' : `${deliveryMt.toLocaleString()} MT`}
						subtitle="Dispatched out"
						iconBg={`${token.colorError}12`}
						iconColor={token.colorError}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<ToolOutlined />}
						label="Production Moves"
						value={loading ? '-' : productionMoves}
						subtitle="Consumed & output"
						iconBg={`${token.colorInfo}18`}
						iconColor={token.colorInfo}
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
					<Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
						<Space wrap>
							<Search
								placeholder="Search by item, reference, staff, or location"
								allowClear
								onChange={(e) => setSearchText(e.target.value)}
								style={{ width: 360, maxWidth: '100%' }}
								size="large"
							/>
							<DatePicker.RangePicker
								size="large"
								onChange={(dates) => setDateRange(dates)}
								style={{ width: 280 }}
							/>
						</Space>
						<Segmented
							size="large"
							value={typeFilter}
							onChange={setTypeFilter}
							options={FILTERS}
						/>
					</Space>
					<Table
						columns={columns}
						dataSource={filteredEntries}
						loading={loading}
						rowKey="id"
						pagination={{ pageSize: 8 }}
					/>
				</Space>
			</div>
		</AppLayout>
	)
}

export default IntakeLog

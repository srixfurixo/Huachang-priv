import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Table, Tag, Space, Row, Col, Button, Progress, theme, App } from 'antd'
import {
	FileTextOutlined,
	InboxOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'
import { ITEM_DESCRIPTION } from '../../../data/mockMasterData'
import PurchaseOrderDetailModal from '../../../components/modals/PurchaseOrderDetailModal'
import CreatePurchaseOrderModal from '../../../components/modals/CreatePurchaseOrderModal'

const { Title, Text } = Typography
const { Search } = Input

const STATUS_COLOR = {
	'Pending': 'blue',
	'Partial': 'gold',
	'Fully Collected': 'green',
	'Overdrawn': 'red',
}

function PurchaseOrders() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const [orders, setOrders] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState('')
	const [createModalOpen, setCreateModalOpen] = useState(false)

	const [selectedPoNumber, setSelectedPoNumber] = useState(null)
	const [detailModalOpen, setDetailModalOpen] = useState(false)

	const fetchOrders = async () => {
		setLoading(true)
		try {
			const res = await axios.get('/api/orders/purchase')
			setOrders(res.data.purchase_orders || [])
		} catch (error) {
			message.error('Failed to load purchase orders from the server.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchOrders()
	}, [])

	const handleViewDetail = (poNumber) => {
		setSelectedPoNumber(poNumber)
		setDetailModalOpen(true)
	}

	const filteredOrders = useMemo(() => {
		const value = searchText.trim().toLowerCase()
		if (!value) return orders
		return orders.filter((po) =>
			[po.po_number, po.supplier_name, po.item_code, po.status]
				.map((f) => (f || '').toString().toLowerCase())
				.some((f) => f.includes(value)),
		)
	}, [orders, searchText])

	const totalPOs = orders.length
	const openBalance = orders
		.filter((o) => Number(o.remaining_balance_mt) > 0)
		.reduce((s, o) => s + Number(o.remaining_balance_mt), 0)
	const fullyCollected = orders.filter((o) => o.status === 'Fully Collected').length
	const overdrawn = orders.filter((o) => o.status === 'Overdrawn').length

	const columns = [
		{
			title: 'PO Number',
			dataIndex: 'po_number',
			key: 'po_number',
			render: (po) => (
				<Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => handleViewDetail(po)}>
					{po}
				</Button>
			),
		},
		{
			title: 'Supplier',
			dataIndex: 'supplier_name', 
			key: 'supplier_name',
			render: (name, record) => name || `Supplier ID: ${record.supplier_id}`
		},
		{
			title: 'Item',
			dataIndex: 'item_code',
			key: 'item_code',
			render: (code) => (
				<div>
					<Text strong style={{ fontSize: 13 }}>{code}</Text>
					<br />
					<Text type="secondary" style={{ fontSize: 12 }}>
						{ITEM_DESCRIPTION[code] || ''}
					</Text>
				</div>
			),
		},
		{
			title: 'Allocated / Ordered',
			key: 'progress',
			width: 240,
			render: (_, record) => {
				const ordered = Number(record.ordered_qty_mt || 0)
				const allocated = Number(record.total_allocated_mt || 0)
				const balance = Number(record.remaining_balance_mt || 0)
				const pct = ordered ? Math.round((allocated / ordered) * 100) : 0
				
				return (
					<div>
						<Progress
							percent={Math.min(pct, 100)}
							size="small"
							status={record.status === 'Overdrawn' ? 'exception' : undefined}
							strokeColor={record.status === 'Fully Collected' ? '#237804' : undefined}
						/>
						<Text type="secondary" style={{ fontSize: 12 }}>
							{allocated.toLocaleString()} / {ordered.toLocaleString()} MT
							{balance < 0 && ` (+${Math.abs(balance)} over)`}
						</Text>
					</div>
				)
			},
		},
		{
			title: 'PO Balance',
			dataIndex: 'remaining_balance_mt',
			key: 'remaining_balance_mt',
			align: 'right',
			sorter: (a, b) => Number(a.remaining_balance_mt) - Number(b.remaining_balance_mt),
			render: (bal) => (
				<Text type={Number(bal) < 0 ? 'danger' : undefined}>{Number(bal).toLocaleString()} MT</Text>
			),
		},
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			filters: Object.keys(STATUS_COLOR).map((s) => ({ text: s, value: s })),
			onFilter: (value, record) => record.status === value,
			render: (status) => <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>,
		},
	]

	return (
		<AppLayout breadcrumbs={['Operations', 'Purchase Orders']}>
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
						Purchase Orders
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Master procurement contracts and fulfillment balances.
					</Text>
				</div>

				<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
					New Purchase Order
				</Button>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<FileTextOutlined />}
						label="Total POs"
						value={loading ? '—' : totalPOs}
						subtitle="All raised purchase orders"
						iconBg={`${token.colorPrimary}18`}
						iconColor={token.colorPrimary}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<InboxOutlined />}
						label="Open Balance"
						value={loading ? '—' : `${openBalance.toLocaleString()} MT`}
						subtitle="Still to be allocated"
						iconBg={`${token.colorInfo}18`}
						iconColor={token.colorInfo}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<CheckCircleOutlined />}
						label="Fully Collected"
						value={loading ? '—' : fullyCollected}
						subtitle="Completed contracts"
						iconBg={`${token.colorSuccess}18`}
						iconColor={token.colorSuccess}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<ExclamationCircleOutlined />}
						label="Overdrawn"
						value={loading ? '—' : overdrawn}
						subtitle="Allocated over ordered"
						alert={!loading && overdrawn > 0 ? `${overdrawn} to review` : undefined}
						iconBg={`${token.colorError}12`}
						iconColor={token.colorError}
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
						placeholder="Search by PO number, supplier, item, or status"
						allowClear
						onChange={(e) => setSearchText(e.target.value)}
						style={{ width: '100%' }}
						size="large"
					/>
					<Table
						columns={columns}
						dataSource={filteredOrders}
						loading={loading}
						rowKey="po_number"
						pagination={{ pageSize: 8 }}
						onRow={(record) => ({
							onClick: () => handleViewDetail(record.po_number),
							style: { cursor: 'pointer' },
						})}
					/>
				</Space>
			</div>

			<PurchaseOrderDetailModal
				open={detailModalOpen}
				onClose={() => setDetailModalOpen(false)}
				poNumber={selectedPoNumber}
			/>

			<CreatePurchaseOrderModal
				open={createModalOpen}
				onClose={() => setCreateModalOpen(false)}
				onSuccess={() => fetchOrders()}
			/>
		</AppLayout>
	)
}

export default PurchaseOrders
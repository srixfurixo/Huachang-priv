import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Table, Tag, Space, Row, Col, Button, Progress, theme, App, Modal, Form, Select, DatePicker, InputNumber, Upload } from 'antd'
import {
	FileTextOutlined,
	InboxOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
	UploadOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'
import { ITEM_DESCRIPTION } from '../../../data/mockMasterData'
import PurchaseOrderDetailModal from '../../../components/modals/PurchaseOrderDetailModal'

const { Title, Text } = Typography
const { Search } = Input

const STATUS_COLOR = {
	'Pending': 'blue',
	'Partial': 'gold',
	'Fully Collected': 'green',
	'Overdrawn': 'red',
}

function checkFileSizeLimit(file) {
	const maxLimitInBytes = 5 * 1024 * 1024;
	if (file.size > maxLimitInBytes) {
		return false;
	}
	return true;
}

function PurchaseOrders() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const [orders, setOrders] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState('')
	const [poModalVisible, setPoModalVisible] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [fileList, setFileList] = useState([])
	const [poForm] = Form.useForm()

	const uploadProps = {
		listType: 'picture',
		maxCount: 1,
		fileList: fileList,
		beforeUpload: (file) => {
			const isValidSize = checkFileSizeLimit(file)
			if (!isValidSize) {
				message.error('File size exceeds the 5MB limit.')
				return Upload.LIST_IGNORE
			}
			setFileList([file])
			return false
		},
		onRemove: () => {
			setFileList([])
		},
	}

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

	const handleCreatePO = async (values) => {
		setSubmitting(true)
		try {
			await axios.post('/api/orders/purchase', {
				po_number: values.po_number,
				supplier_id: values.supplier_id, 
				item_code: values.item_code,
				po_date: values.po_date.format('YYYY-MM-DD'),
				ordered_qty_mt: values.ordered_qty_mt,
				created_by: 1 
			})
			if (fileList.length > 0) {
				const attachedFile = fileList[0]
				const formData = new FormData()
				formData.append('document', attachedFile)
				formData.append('document_type', 'PO')
				formData.append('reference_number', values.po_number)
				formData.append('document_name', attachedFile.name)

				await axios.post('/api/documents/upload', formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				})
			}
			message.success('Purchase Order created successfully.')
			setPoModalVisible(false)
			setFileList([])
			poForm.resetFields()
			fetchOrders() 
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to create Purchase Order.')
		} finally {
			setSubmitting(false)
		}
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

				<Button type="primary" icon={<PlusOutlined />} onClick={() => setPoModalVisible(true)}>
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

			<Modal
				title="Create New Purchase Order"
				open={poModalVisible}
				onCancel={() => {
					setPoModalVisible(false)
					setFileList([])
					poForm.resetFields()
				}}
				onOk={() => poForm.submit()}
				confirmLoading={submitting}
			>
				<Form form={poForm} layout="vertical" onFinish={handleCreatePO}>
					<Form.Item name="po_number" label="PO Number" rules={[{ required: true, message: 'Please input the PO number!' }]}>
						<Input placeholder="e.g. 2405-53" />
					</Form.Item>
					
					<Form.Item name="supplier_id" label="Supplier ID" rules={[{ required: true, message: 'Please input the numeric supplier ID!' }]}>
						<InputNumber style={{ width: '100%' }} placeholder="e.g. 2" />
					</Form.Item>

					<Form.Item name="item_code" label="Material Item Code" rules={[{ required: true, message: 'Please select an item code!' }]}>
						<Select placeholder="Select item reference">
							<Select.Option value="MOP">MOP (Muriate of Potash)</Select.Option>
							<Select.Option value="ERP">ERP (Egypt Rock Phosphate)</Select.Option>
							<Select.Option value="CIRP">CIRP (Trading Phosphate)</Select.Option>
						</Select>
					</Form.Item>

					<Form.Item name="po_date" label="PO Date" rules={[{ required: true, message: 'Please select the order date!' }]}>
						<DatePicker style={{ width: '100%' }} />
					</Form.Item>

					<Form.Item name="ordered_qty_mt" label="Ordered Quantity (MT)" rules={[{ required: true, message: 'Please input the ordered tonnage!' }]}>
						<InputNumber style={{ width: '100%' }} min={0.001} precision={3} placeholder="1000.000" />
					</Form.Item>

					<Form.Item label="Attach Document (Optional)">
						<Upload {...uploadProps}>
							<Button icon={<UploadOutlined />}>Upload (Max: 1)</Button>
						</Upload>
					</Form.Item>
				</Form>
			</Modal>
		</AppLayout>
	)
}

export default PurchaseOrders
import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Table, Tag, Space, Row, Col, Button, theme, App, Modal, Form, Select, DatePicker, InputNumber, Upload } from 'antd'
import {
	FileProtectOutlined,
	ShoppingOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
	UploadOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'
import { ITEM_DESCRIPTION } from '../../../data/mockMasterData'
import SalesOrderDetailModal from '../../../components/modals/SalesOrderDetailModal'

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

function SalesOrders() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	
	const [orders, setOrders] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState('')

	const [soModalVisible, setSoModalVisible] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [fileList, setFileList] = useState([])
	const [soForm] = Form.useForm()

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

	const [selectedSoNumber, setSelectedSoNumber] = useState(null)
	const [detailModalOpen, setDetailModalOpen] = useState(false)

	const fetchSalesOrders = async () => {
		setLoading(true)
		try {
			const res = await axios.get('/api/orders/get-sales')
			setOrders(res.data.sales_orders || [])
		} catch (error) {
			message.error('Failed to retrieve sales orders from the database.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchSalesOrders()
	}, [])

	const handleViewDetail = (soNumber) => {
		setSelectedSoNumber(soNumber)
		setDetailModalOpen(true)
	}

	const handleCreateSO = async (values) => {
		setSubmitting(true)
		try {
			await axios.post('/api/orders/sales', {
				so_number: values.so_number,
				customer_id: values.customer_id,
				item_code: values.item_code,
				so_date: values.so_date.format('YYYY-MM-DD'),
				ordered_qty_mt: values.ordered_qty_mt,
				created_by: 1 
			})
			if (fileList.length > 0) {
				const attachedFile = fileList[0]
				const formData = new FormData()
				formData.append('document', attachedFile)
				formData.append('document_type', 'SO')
				formData.append('reference_number', values.so_number)
				formData.append('document_name', attachedFile.name)

				await axios.post('/api/documents/upload', formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				})
			}
			message.success('Sales Order registered successfully.')
			setSoModalVisible(false)
			setFileList([])
			soForm.resetFields()
			fetchSalesOrders() 
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to record Sales Order.')
		} finally {
			setSubmitting(false)
		}
	}

	const filteredOrders = useMemo(() => {
		const value = searchText.trim().toLowerCase()
		if (!value) return orders
		return orders.filter((so) =>
			[so.so_number, so.customer_name, so.item_code, so.status]
				.map((f) => (f || '').toString().toLowerCase())
				.some((f) => f.includes(value)),
		)
	}, [orders, searchText])

	const totalSOs = orders.length
	const openBalance = orders
		.filter((o) => Number(o.remaining_balance_mt || o.ordered_qty_mt) > 0)
		.reduce((s, o) => s + Number(o.remaining_balance_mt || o.ordered_qty_mt), 0)
	const fullyCollected = orders.filter((o) => o.status === 'Fully Collected').length
	const overdrawn = orders.filter((o) => o.status === 'Overdrawn').length

	const columns = [
		{
			title: 'SO Number',
			dataIndex: 'so_number',
			key: 'so_number',
			render: (so) => (
				<Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => handleViewDetail(so)}>
					{so}
				</Button>
			),
		},
		{
			title: 'Customer (Debtor)',
			dataIndex: 'customer_name',
			key: 'customer_name',
			render: (name, record) => name || `Customer ID: ${record.customer_id}`
		},
		{
			title: 'Item Code',
			dataIndex: 'item_code',
			key: 'item_code',
			render: (code) => (
				<div>
					<Text strong style={{ fontSize: 13 }}>{code}</Text>
					<br />
					<Text type="secondary" style={{ fontSize: 12 }}>
						{ITEM_DESCRIPTION[code] || 'Fertilizer Product'}
					</Text>
				</div>
			),
		},
		{
			title: 'Ordered Quantity',
			dataIndex: 'ordered_qty_mt',
			key: 'ordered_qty_mt',
			align: 'right',
			sorter: (a, b) => Number(a.ordered_qty_mt) - Number(b.ordered_qty_mt),
			render: (qty) => <Text strong>{Number(qty).toLocaleString()} MT</Text>,
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
		<AppLayout breadcrumbs={['Operations', 'Sales Orders']}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
				<div>
					<Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}>
						Sales Orders
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Manage customer order commitments and monitor current commercial accounts.
					</Text>
				</div>

				<Button type="primary" icon={<PlusOutlined />} onClick={() => setSoModalVisible(true)}>
					New Sales Order
				</Button>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<ShoppingOutlined />} label="Total Contracts" value={loading ? '—' : totalSOs} subtitle="All logged sales orders" iconBg={`${token.colorPrimary}18`} iconColor={token.colorPrimary} />
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<FileProtectOutlined />} label="Total Capacity" value={loading ? '—' : `${openBalance.toLocaleString()} MT`} subtitle="Total weight committed" iconBg={`${token.colorInfo}18`} iconColor={token.colorInfo} />
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<CheckCircleOutlined />} label="Fully Cleared" value={loading ? '—' : fullyCollected} subtitle="Finished Sales Order" iconBg={`${token.colorSuccess}18`} iconColor={token.colorSuccess} />
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<ExclamationCircleOutlined />} label="Overdrawn Orders" value={loading ? '—' : overdrawn} subtitle="Dispatches exceeding limits" alert={!loading && overdrawn > 0 ? `${overdrawn} over capacity` : undefined} iconBg={`${token.colorError}12`} iconColor={token.colorError} />
				</Col>
			</Row>

			<div style={{ background: token.colorBgContainer, padding: 24, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}` }}>
				<Space direction="vertical" style={{ width: '100%' }} size="large">
					<Search placeholder="Search by SO number, customer name, material item, or status" allowClear onChange={(e) => setSearchText(e.target.value)} style={{ width: '100%' }} size="large" />
					<Table
						columns={columns}
						dataSource={filteredOrders}
						loading={loading}
						rowKey="so_number"
						pagination={{ pageSize: 8 }}
						onRow={(record) => ({
							onClick: () => handleViewDetail(record.so_number),
							style: { cursor: 'pointer' },
						})}
					/>
				</Space>
			</div>

			<SalesOrderDetailModal
				open={detailModalOpen}
				onClose={() => setDetailModalOpen(false)}
				soNumber={selectedSoNumber}
			/>

			<Modal
				title="Create New Sales Order"
				open={soModalVisible}
				onCancel={() => {
					setSoModalVisible(false)
					setFileList([])
					soForm.resetFields()
				}}
				onOk={() => soForm.submit()}
				confirmLoading={submitting}
			>
				<Form form={soForm} layout="vertical" onFinish={handleCreateSO}>
					<Form.Item name="so_number" label="Sales Order (SO) Number" rules={[{ required: true, message: 'Please input the SO number reference!' }]}>
						<Input placeholder="e.g. SO-2026-0089" />
					</Form.Item>
					
					<Form.Item name="customer_id" label="Customer (Debtor) Master ID" rules={[{ required: true, message: 'Please enter the numeric customer ID reference!' }]}>
						<InputNumber style={{ width: '100%' }} placeholder="e.g. 5" />
					</Form.Item>

					<Form.Item name="item_code" label="Material Item Code" rules={[{ required: true, message: 'Please select the material family!' }]}>
						<Select placeholder="Select item category">
							<Select.Option value="MOP">MOP (Muriate of Potash)</Select.Option>
							<Select.Option value="ERP">ERP (Egypt Rock Phosphate)</Select.Option>
							<Select.Option value="CIRP">CIRP (Trading Phosphate)</Select.Option>
							<Select.Option value="CBB-403">CBB-403 (Compound BB 10-10-30)</Select.Option>
							<Select.Option value="CBB-404">CBB-404 (Compound BB 13-13-21)</Select.Option>
						</Select>
					</Form.Item>

					<Form.Item name="so_date" label="SO Booking Date" rules={[{ required: true, message: 'Please pick the order confirmation date!' }]}>
						<DatePicker style={{ width: '100%' }} />
					</Form.Item>

					<Form.Item name="ordered_qty_mt" label="Committed Quantity (MT)" rules={[{ required: true, message: 'Input valid positive quantity tonnage!' }]}>
						<InputNumber style={{ width: '100%' }} min={0.001} precision={3} placeholder="50.000" />
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

export default SalesOrders
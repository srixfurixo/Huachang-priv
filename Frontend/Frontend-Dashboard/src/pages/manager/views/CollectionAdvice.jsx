import { useState, useEffect, useMemo } from 'react'
import { Typography, Input, Table, Tag, Space, Row, Col, Button, theme, App, Tabs, Modal, Form, Select, DatePicker, InputNumber, Switch } from 'antd'
import {
	ContainerOutlined,
	ClockCircleOutlined,
	CheckCircleOutlined,
	WarningOutlined,
	PlusOutlined,
	FileTextOutlined,
	DeploymentUnitOutlined
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'
import { ITEM_DESCRIPTION } from '../../../data/mockMasterData'
import CollectionAdviceDetailModal from '../../../components/modals/CollectionAdviceDetailModal'

const { Title, Text } = Typography
const { Search } = Input

const STATUS_COLOR = {
	'Dispatched': 'blue',
	'Unloading': 'gold',
	'Completed': 'green',
	'Cancelled': 'red',
}

const DEST_COLOR = {
	Customer: 'geekblue',
	'Internal Store': 'green',
	'External Warehouse': 'purple',
}

function CollectionAdvice() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const [activeTab, setActiveTab] = useState('huachang')
	const [searchText, setSearchText] = useState('')
	const [loading, setLoading] = useState(true)
	const [truckingRegistry, setTruckingRegistry] = useState([])
	const [activeSupplierCas, setActiveSupplierCas] = useState([])
	const [purchaseOrders, setPurchaseOrders] = useState([]) 
	const [supplierModalOpen, setSupplierModalOpen] = useState(false)
	const [huachangModalOpen, setHuachangModalOpen] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [autoGenNumber, setAutoGenNumber] = useState(true)

	const [selectedHgCaNumber, setSelectedHgCaNumber] = useState(null)
	const [detailModalOpen, setDetailModalOpen] = useState(false)

	const [supplierForm] = Form.useForm()
	const [huachangForm] = Form.useForm()

	const fetchData = async () => {
		setLoading(true)
		try {
			const [registryRes, supplierRes, poRes] = await Promise.all([
				axios.get('/api/logistics/get_ca'),
				axios.get('/api/logistics/supplier-ca/active'),
				axios.get('/api/orders/purchase')
			])
			setTruckingRegistry(registryRes.data.trucking_registry || [])
			setActiveSupplierCas(supplierRes.data.active_supplier_cas || [])
			setPurchaseOrders(poRes.data.purchase_orders || [])
		} catch (err) {
			message.error('Failed to synchronize data from collection advice services.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchData()
	}, [])

	const handleViewDetail = (hgCaNumber) => {
		setSelectedHgCaNumber(hgCaNumber)
		setDetailModalOpen(true)
	}

	const generateCollectionAdviceNumber = () => {
		const yearPrefix = new Date().getFullYear().toString().slice(-2);
		const operationalSerial = Math.floor(1000 + Math.random() * 9000);
		return `CA ${yearPrefix}-${operationalSerial}`;
	}

	useEffect(() => {
		if (huachangModalOpen && autoGenNumber) {
			huachangForm.setFieldsValue({ hg_ca_number: generateCollectionAdviceNumber() });
		} else if (huachangModalOpen && !autoGenNumber) {
			huachangForm.setFieldsValue({ hg_ca_number: '' });
		}
	}, [autoGenNumber, huachangModalOpen, huachangForm])

	const handleCreateSupplierCa = async (values) => {
		setSubmitting(true)
		try {
			await axios.post('/api/logistics/supplier-ca', {
				po_number: values.po_number,
				supplier_ca_ref: values.supplier_ca_ref,
				ca_date: values.ca_date.format('YYYY-MM-DD'),
				available_qty_mt: values.available_qty_mt
			})
			message.success('Supplier Collection Advice lot successfully recorded.')
			setSupplierModalOpen(false)
			supplierForm.resetFields()
			fetchData()
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to register Supplier CA.')
		} finally {
			setSubmitting(false)
		}
	}

	const handleCreateHuachangCa = async (values) => {
		setSubmitting(true)
		try {
			await axios.post('/api/logistics/huachang-ca', {
				hg_ca_number: values.hg_ca_number,
				supplier_ca_id: values.supplier_ca_id,
				ca_date: values.ca_date.format('YYYY-MM-DD'),
				destination_type: values.destination_type,
				destination_id: values.destination_id || null,
				pickup_location_id: values.pickup_location_id,
				item_code: values.item_code,
				quantity_mt: values.quantity_mt,
				transporter_name: values.transporter_name,
				driver_name: values.driver_name,
				lorry_number: values.lorry_number,
				created_by: 1
			})
			message.success('Huachang Collection Advice issued successfully.')
			setHuachangModalOpen(false)
			huachangForm.resetFields()
			fetchData()
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to issue Huachang CA.')
		} finally {
			setSubmitting(false)
		}
	}

	const totalDispatches = truckingRegistry.length
	const activeLotsCount = activeSupplierCas.length
	const travelingLoads = truckingRegistry.filter((c) => c.status === 'Dispatched').length
	const completedIntakes = truckingRegistry.filter((c) => c.status === 'Completed').length

	const supplierColumns = [
		{ title: 'PO Number', dataIndex: 'po_number', key: 'po_number', render: (t) => <Text strong>{t}</Text> },
		{ title: 'Supplier CA Ref', dataIndex: 'supplier_ca_ref', key: 'supplier_ca_ref' },
		{ title: 'Allocation Date', dataIndex: 'ca_date', key: 'ca_date' },
		{ title: 'Authorized (MT)', dataIndex: 'available_qty_mt', key: 'available_qty_mt', align: 'right', render: (v) => Number(v).toLocaleString() },
		{ title: 'Collected Weight (MT)', dataIndex: 'total_truck_dispatched_mt', key: 'total_truck_dispatched_mt', align: 'right', render: (v) => Number(v).toLocaleString() },
		{ title: 'Open CA Balance', dataIndex: 'remaining_ca_balance_mt', key: 'remaining_ca_balance_mt', align: 'right', render: (v) => <Text strong type="success">{Number(v).toLocaleString()} MT</Text> },
	]

	const huachangColumns = [
		{
			title: 'HG CA No.',
			dataIndex: 'hg_ca_number',
			key: 'hg_ca_number',
			render: (no) => (
				<Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => handleViewDetail(no)}>
					{no}
				</Button>
			),
		},
		{ title: 'Date', dataIndex: 'ca_date', key: 'ca_date' },
		{ title: 'Item', dataIndex: 'item_code', key: 'item_code', render: (code) => (
			<div>
				<Text strong style={{ fontSize: 13 }}>{code}</Text>
				<br />
				<Text type="secondary" style={{ fontSize: 12 }}>{ITEM_DESCRIPTION[code] || 'Fertilizer Material'}</Text>
			</div>
		)},
		{ title: 'Weight (MT)', dataIndex: 'quantity_mt', key: 'quantity_mt', align: 'right', render: (mt) => Number(mt).toLocaleString() },
		{ title: 'Contract Reference Links', key: 'refs', render: (_, r) => (
			<div>
				<Text style={{ fontSize: 12 }}>PO: {r.po_number}</Text><br />
				<Text type="secondary" style={{ fontSize: 11 }}>Supplier CA: {r.supplier_ca_ref}</Text>
			</div>
		)},
		{ title: 'Transport / Lorry Details', key: 'fleet', render: (_, r) => (
			<div>
				<Text strong style={{ fontSize: 12 }}>{r.lorry_number || '—'}</Text><br />
				<Text type="secondary" style={{ fontSize: 11 }}>{r.transporter_name} ({r.driver_name})</Text>
			</div>
		)},
		{ title: 'Pickup Warehouse', dataIndex: 'pickup_location_name', key: 'pickup_location_name' },
		{ title: 'Destination', key: 'destination', render: (_, record) => (
			<div>
				<Tag color={DEST_COLOR[record.destination_type] || 'default'}>{record.destination_type}</Tag>
				{record.destination_id && <div style={{ fontSize: 11, marginTop: 2 }}>Entity ID: {record.destination_id}</div>}
			</div>
		)},
		{ title: 'Status', dataIndex: 'status', key: 'status', render: (status) => <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag> }
	]

	const filteredSupplierData = useMemo(() => {
		const val = searchText.trim().toLowerCase()
		if (!val) return activeSupplierCas
		return activeSupplierCas.filter(s => [s.po_number, s.supplier_ca_ref].some(f => (f || '').toLowerCase().includes(val)))
	}, [activeSupplierCas, searchText])

	const filteredHuachangData = useMemo(() => {
		const val = searchText.trim().toLowerCase()
		if (!val) return truckingRegistry
		return truckingRegistry.filter(h => [h.hg_ca_number, h.po_number, h.supplier_ca_ref, h.lorry_number, h.item_code, h.status].some(f => (f || '').toLowerCase().includes(val)))
	}, [truckingRegistry, searchText])

	return (
		<AppLayout breadcrumbs={['Operations', 'Collection Advice Management']}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
				<div>
					<Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}>
						Collection Advice Management
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Audit open supplier contracts and track active operational distribution requests.
					</Text>
				</div>

				<Space>
					<Button type="default" icon={<FileTextOutlined />} onClick={() => setSupplierModalOpen(true)}>
						Log Supplier CA
					</Button>
					<Button type="primary" icon={<PlusOutlined />} onClick={() => setHuachangModalOpen(true)}>
						Issue Huachang CA
					</Button>
				</Space>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<ContainerOutlined />} label="Total Dispatches" value={loading ? '—' : totalDispatches} subtitle="All collection advice items" iconBg={`${token.colorPrimary}18`} iconColor={token.colorPrimary} />
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<DeploymentUnitOutlined />} label="Open CAs" value={loading ? '—' : activeLotsCount} subtitle="Active available balances" iconBg={`${token.colorInfo}18`} iconColor={token.colorInfo} />
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<ClockCircleOutlined />} label="En Route / Dispatched" value={loading ? '—' : travelingLoads} subtitle="Materials currently in transit" iconBg={`${token.colorWarning}18`} iconColor={token.colorWarning} />
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard icon={<CheckCircleOutlined />} label="Completed Intake" value={loading ? '—' : completedIntakes} subtitle="Successfully received cargo rounds" iconBg={`${token.colorSuccess}18`} iconColor={token.colorSuccess} />
				</Col>
			</Row>

			<div style={{ background: token.colorBgContainer, padding: 24, borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}` }}>
				<Space direction="vertical" style={{ width: '100%' }} size="large">
					<Search placeholder="Search across parameters, document numbers, or code identifiers" allowClear onChange={(e) => setSearchText(e.target.value)} style={{ width: '100%' }} size="large" />
					
					<Tabs activeKey={activeTab} onChange={setActiveTab} items={[
						{ key: 'huachang', label: 'Huachang Ledger Log', children: <Table columns={huachangColumns} dataSource={filteredHuachangData} loading={loading} rowKey="hg_ca_number" pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} onRow={(record) => ({ onClick: () => handleViewDetail(record.hg_ca_number), style: { cursor: 'pointer' } })} /> },
						{ key: 'supplier', label: 'Pending Arriving CAs', children: <Table columns={supplierColumns} dataSource={filteredSupplierData} loading={loading} rowKey="id" pagination={{ pageSize: 8 }} /> }
					]} />
				</Space>
			</div>

			<CollectionAdviceDetailModal
				open={detailModalOpen}
				onClose={() => setDetailModalOpen(false)}
				hgCaNumber={selectedHgCaNumber}
			/>

			<Modal title="Log Supplier Collection Advice" open={supplierModalOpen} onCancel={() => setSupplierModalOpen(false)} onOk={() => supplierForm.submit()} confirmLoading={submitting}>
				<Form form={supplierForm} layout="vertical" onFinish={handleCreateSupplierCa}>
					<Form.Item name="po_number" label="Parent Purchase Order Link" rules={[{ required: true, message: 'Select master purchase order reference anchor!' }]}>
						<Select placeholder="Select parent purchase contract">
							{purchaseOrders.map(p => (
								<Select.Option key={p.po_number} value={p.po_number}>
									{p.po_number} ({p.supplier_name} - {p.item_code})
								</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item name="supplier_ca_ref" label="Supplier CA Reference Number" rules={[{ required: true }]}>
						<Input placeholder="e.g. 0131606113" />
					</Form.Item>
					<Form.Item name="ca_date" label="Authorization Issue Date" rules={[{ required: true }]}>
						<DatePicker style={{ width: '100%' }} />
					</Form.Item>
					<Form.Item name="available_qty_mt" label="Total Authorized Lot Capacity (MT)" rules={[{ required: true }]}>
						<InputNumber style={{ width: '100%' }} min={0.001} precision={3} placeholder="200.000" />
					</Form.Item>
				</Form>
			</Modal>

			<Modal title="Issue Huachang Collection Advice" open={huachangModalOpen} onCancel={() => setHuachangModalOpen(false)} onOk={() => huachangForm.submit()} confirmLoading={submitting} width={600}>
				<Form form={huachangForm} layout="vertical" onFinish={handleCreateHuachangCa}>
					<div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Text type="secondary">System Number Generation Assignment</Text>
						<Space>
							<Text style={{ fontSize: 12 }}>Auto-Generate ID</Text>
							<Switch size="small" checked={autoGenNumber} onChange={setAutoGenNumber} />
						</Space>
					</div>

					<Form.Item name="hg_ca_number" label="Huachang Collection Advice Number" rules={[{ required: true, message: 'Input or auto-generate advice document number!' }]}>
						<Input placeholder="e.g. CA 25-0101" disabled={autoGenNumber} />
					</Form.Item>
					
					<Form.Item name="supplier_ca_id" label="Supplier CA" rules={[{ required: true, message: 'Select allocation source lot!' }]}>
						<Select placeholder="Select open supplier allocation source">
							{activeSupplierCas.map(s => (
								<Select.Option key={s.id} value={s.id}>
									PO: {s.po_number} | Ref: {s.supplier_ca_ref} ({Number(s.remaining_ca_balance_mt).toLocaleString()} MT left)
								</Select.Option>
							))}
						</Select>
					</Form.Item>

					<Form.Item name="ca_date" label="Collection Execution Date" rules={[{ required: true }]}>
						<DatePicker style={{ width: '100%' }} />
					</Form.Item>

					<Form.Item name="pickup_location_id" label="Pickup Warehouse Location Master ID" rules={[{ required: true }]}>
						<InputNumber style={{ width: '100%' }} placeholder="e.g. 3" />
					</Form.Item>

					<Form.Item name="item_code" label="Material Code" rules={[{ required: true }]}>
						<Select placeholder="Select verified material family">
							<Select.Option value="MOP">MOP</Select.Option>
							<Select.Option value="ERP">ERP</Select.Option>
							<Select.Option value="CIRP">CIRP</Select.Option>
						</Select>
					</Form.Item>

					<Form.Item name="quantity_mt" label="Collecting Amount (MT)" rules={[{ required: true }]}>
						<InputNumber style={{ width: '100%' }} min={0.001} precision={3} placeholder="25.000" />
					</Form.Item>

					<Row gutter={[16, 16]}>
						<Col span={12}>
							<Form.Item name="destination_type" label="Destination Type" rules={[{ required: true }]}>
								<Select placeholder="Select storage branch type">
									<Select.Option value="Internal Store">Internal Store</Select.Option>
									<Select.Option value="External Warehouse">External Warehouse</Select.Option>
									<Select.Option value="Customer">Customer</Select.Option>
								</Select>
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item name="destination_id" label="Destination Warehouse/Customer ID">
								<InputNumber style={{ width: '100%' }} placeholder="e.g. 4 (Optional Link)" />
							</Form.Item>
						</Col>
					</Row>

					<Row gutter={[16, 16]}>
						<Col span={8}>
							<Form.Item name="transporter_name" label="Transporter Company">
								<Input placeholder="e.g. Lalamove, J&T" />
							</Form.Item>
						</Col>
						<Col span={8}>
							<Form.Item name="driver_name" label="Driver Full Name">
								<Input placeholder="Driver Name" />
							</Form.Item>
						</Col>
						<Col span={8}>
							<Form.Item name="lorry_number" label="Lorry Number Plate">
								<Input placeholder="PRC 7289" />
							</Form.Item>
						</Col>
					</Row>
				</Form>
			</Modal>
		</AppLayout>
	)
}

export default CollectionAdvice;
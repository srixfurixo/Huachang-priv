import { useState, useEffect, useMemo } from 'react'
import {
	Typography,
	Input,
	Table,
	Tag,
	Space,
	Row,
	Col,
	Button,
	theme,
	App,
	Modal,
	Form,
	Select,
	InputNumber,
	Popconfirm,
	Empty,
} from 'antd'
import {
	AppstoreOutlined,
	GoldOutlined,
	InboxOutlined,
	StopOutlined,
	PlusOutlined,
	EditOutlined,
	DeleteOutlined,
	UndoOutlined,
} from '@ant-design/icons'
import axios from 'axios'

import AppLayout from '../../../components/layout/AppLayout'
import StatCard from '../../../components/common/StatCard'

const { Title, Text } = Typography
const { Search } = Input

const UOM_OPTIONS = ['MT', 'BAG', 'BOTTLE']
const ITEM_CATEGORY_OPTIONS = [
	{ value: 'finished', label: 'Finished product' },
	{ value: 'raw', label: 'Raw material / ingredient' },
	{ value: 'stock', label: 'Packaging or trading item' },
]

function categoryFromItem(item) {
	if (item.can_be_produced) return 'finished'
	if (item.can_be_consumed) return 'raw'
	return 'stock'
}

function flagsFromCategory(category) {
	return {
		can_be_consumed: category === 'raw',
		can_be_produced: category === 'finished',
	}
}

function itemKind(item) {
	if (item.can_be_produced) return 'Finished'
	if (item.can_be_consumed) return 'Raw'
	return 'Trading'
}

function kindColor(kind) {
	if (kind === 'Finished') return 'blue'
	if (kind === 'Raw') return 'green'
	return 'default'
}

function bagKgFromDescription(description) {
	const match = String(description || '').match(/(\d+(?:\.\d+)?)\s*KG/i)
	return match ? Number(match[1]) : null
}

function displayBagKg(item) {
	const stored = item.bag_weight_kg != null ? Number(item.bag_weight_kg) : null
	if (stored && stored > 0) return stored
	return bagKgFromDescription(item.description)
}

function ItemManagement() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const [form] = Form.useForm()

	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchText, setSearchText] = useState('')
	const [kindFilter, setKindFilter] = useState('all')

	const [modalOpen, setModalOpen] = useState(false)
	const [editingItem, setEditingItem] = useState(null)
	const [submitting, setSubmitting] = useState(false)

	const fetchItems = async () => {
		setLoading(true)
		try {
			const res = await axios.get('/api/referenceData/items', {
				params: { include_inactive: true },
			})
			setItems(Array.isArray(res.data) ? res.data : [])
		} catch {
			message.error('Failed to load the item catalog.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchItems()
	}, [])

	const rows = useMemo(
		() =>
			items.map((item) => ({
				...item,
				kind: itemKind(item),
				bag_kg: displayBagKg(item),
			})),
		[items],
	)

	const filteredRows = useMemo(() => {
		const value = searchText.trim().toLowerCase()
		return rows.filter((item) => {
			if (kindFilter === 'finished' && item.kind !== 'Finished') return false
			if (kindFilter === 'raw' && item.kind !== 'Raw') return false
			if (kindFilter === 'trading' && item.kind !== 'Trading') return false
			if (kindFilter === 'inactive' && item.is_active !== false) return false
			if (kindFilter === 'bagged' && !item.bag_kg) return false
			if (!value) return true
			return [item.item_code, item.description, item.uom]
				.map((field) => (field || '').toLowerCase())
				.some((field) => field.includes(value))
		})
	}, [rows, searchText, kindFilter])

	const activeCount = rows.filter((item) => item.is_active !== false).length
	const finishedCount = rows.filter((item) => item.kind === 'Finished' && item.is_active !== false).length
	const rawCount = rows.filter((item) => item.kind === 'Raw' && item.is_active !== false).length
	const inactiveCount = rows.filter((item) => item.is_active === false).length

	const openCreate = () => {
		setEditingItem(null)
		form.resetFields()
		form.setFieldsValue({
			uom: 'MT',
			threshold_level: 0,
		})
		setModalOpen(true)
	}

	const openEdit = (record) => {
		setEditingItem(record)
		form.setFieldsValue({
			item_code: record.item_code,
			description: record.description,
			uom: record.uom,
			threshold_level: Number(record.threshold_level || 0),
			bag_weight_kg: record.bag_weight_kg != null ? Number(record.bag_weight_kg) : undefined,
			item_category: categoryFromItem(record),
		})
		setModalOpen(true)
	}

	const findConflict = (values) => {
		const code = String(values.item_code || '').trim().toUpperCase()
		const description = String(values.description || '').trim().toLowerCase()
		const sameCode = items.find(
			(item) => item.item_code.toUpperCase() === code && item.item_code !== editingItem?.item_code,
		)
		if (sameCode) {
			return sameCode.is_active
				? `Item code ${sameCode.item_code} already exists.`
				: `Item code ${sameCode.item_code} already exists but is inactive. Restore it instead of adding a duplicate.`
		}
		const sameName = items.find(
			(item) =>
				(item.description || '').trim().toLowerCase() === description &&
				item.item_code !== editingItem?.item_code,
		)
		return { sameName }
	}

	const handleSubmit = async (values) => {
		const conflict = findConflict(values)
		if (typeof conflict === 'string') {
			message.error(conflict)
			return
		}

		const save = async () => {
			setSubmitting(true)
			try {
				const categoryFlags = flagsFromCategory(values.item_category)
				const payload = {
					item_code: String(values.item_code).trim().toUpperCase(),
					description: String(values.description).trim(),
					uom: String(values.uom).trim().toUpperCase(),
					threshold_level: values.threshold_level ?? 0,
					bag_weight_kg: values.bag_weight_kg ?? null,
					can_be_sold: editingItem ? Boolean(editingItem.can_be_sold) : true,
					...categoryFlags,
				}

				if (editingItem) {
					await axios.patch(`/api/referenceData/items/${encodeURIComponent(editingItem.item_code)}`, payload)
					message.success('Item updated.')
				} else {
					await axios.post('/api/referenceData/items', payload)
					message.success('Item added to the catalog.')
				}

				setModalOpen(false)
				form.resetFields()
				fetchItems()
			} catch (err) {
				const status = err.response?.status
				if (status === 409) {
					message.error(err.response?.data?.error || 'This item code already exists.')
				} else {
					message.error(err.response?.data?.error || 'Failed to save item.')
				}
			} finally {
				setSubmitting(false)
			}
		}

		if (conflict.sameName) {
			Modal.confirm({
				title: 'Similar description already exists',
				content: `${conflict.sameName.item_code} already uses "${conflict.sameName.description}". Add this as a separate SKU anyway (for example BB-103 vs BB-103(A))?`,
				okText: 'Add anyway',
				onOk: save,
			})
			return
		}

		save()
	}

	const handleDeactivate = async (itemCode) => {
		try {
			await axios.delete(`/api/referenceData/items/${encodeURIComponent(itemCode)}`)
			message.success('Item deactivated. It stays in history but will not appear in new orders.')
			fetchItems()
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to deactivate item.')
		}
	}

	const handleRestore = async (itemCode) => {
		try {
			await axios.patch(`/api/referenceData/items/${encodeURIComponent(itemCode)}/restore`)
			message.success('Item restored.')
			fetchItems()
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to restore item.')
		}
	}

	const columns = [
		{
			title: 'Item code',
			dataIndex: 'item_code',
			key: 'item_code',
			render: (code) => <Text strong style={{ fontFamily: "'Roboto Mono', monospace" }}>{code}</Text>,
		},
		{
			title: 'Description',
			dataIndex: 'description',
			key: 'description',
		},
		{
			title: 'Type',
			dataIndex: 'kind',
			key: 'kind',
			render: (kind) => <Tag color={kindColor(kind)}>{kind}</Tag>,
		},
		{
			title: 'UOM',
			dataIndex: 'uom',
			key: 'uom',
			width: 90,
		},
		{
			title: 'Bag',
			dataIndex: 'bag_kg',
			key: 'bag_kg',
			align: 'right',
			render: (kg) => (kg ? `${kg} KG` : '—'),
		},
		{
			title: 'Threshold',
			dataIndex: 'threshold_level',
			key: 'threshold_level',
			align: 'right',
			render: (value) => Number(value || 0).toFixed(3),
		},
		{
			title: 'Flags',
			key: 'flags',
			render: (_, record) => (
				<Space size={4} wrap>
					{record.can_be_sold && <Tag>Sold</Tag>}
					{record.can_be_consumed && <Tag color="green">Ingredient</Tag>}
					{record.can_be_produced && <Tag color="blue">Produced</Tag>}
				</Space>
			),
		},
		{
			title: 'Status',
			dataIndex: 'is_active',
			key: 'is_active',
			render: (active) =>
				active === false ? <Tag color="red">Inactive</Tag> : <Tag color="green">Active</Tag>,
		},
		{
			title: 'Actions',
			key: 'actions',
			width: 200,
			render: (_, record) => (
				<Space>
					<Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
						Edit
					</Button>
					{record.is_active === false ? (
						<Button size="small" icon={<UndoOutlined />} onClick={() => handleRestore(record.item_code)}>
							Restore
						</Button>
					) : (
						<Popconfirm
							title="Deactivate this item?"
							description="It is not deleted. It is hidden from new orders so history stays intact."
							okText="Deactivate"
							okButtonProps={{ danger: true }}
							onConfirm={() => handleDeactivate(record.item_code)}
						>
							<Button size="small" danger icon={<DeleteOutlined />}>
								Remove
							</Button>
						</Popconfirm>
					)}
				</Space>
			),
		},
	]

	return (
		<AppLayout breadcrumbs={['Operations', 'Item Management']}>
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
						Item Management
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Catalog of finished products, raw ingredients, and bagged SKUs. Duplicate item codes are blocked.
					</Text>
				</div>
				<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
					Add item
				</Button>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<AppstoreOutlined />}
						label="Active items"
						value={loading ? '—' : activeCount}
						subtitle="Live catalog SKUs"
						iconBg={`${token.colorPrimary}18`}
						iconColor={token.colorPrimary}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<GoldOutlined />}
						label="Finished goods"
						value={loading ? '—' : finishedCount}
						subtitle="Produced inventory"
						iconBg={`${token.colorInfo}18`}
						iconColor={token.colorInfo}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<InboxOutlined />}
						label="Raw ingredients"
						value={loading ? '—' : rawCount}
						subtitle="Production materials"
						iconBg={`${token.colorSuccess}18`}
						iconColor={token.colorSuccess}
					/>
				</Col>
				<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
					<StatCard
						icon={<StopOutlined />}
						label="Inactive"
						value={loading ? '—' : inactiveCount}
						subtitle="Removed from new use"
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
					<Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
						<Search
							placeholder="Search item code or name, e.g. HG-02 or GOLDMAS"
							allowClear
							onChange={(e) => setSearchText(e.target.value)}
							style={{ minWidth: 280, flex: 1 }}
							size="large"
						/>
						<Select
							value={kindFilter}
							onChange={setKindFilter}
							style={{ width: 200 }}
							size="large"
							options={[
								{ value: 'all', label: 'All items' },
								{ value: 'finished', label: 'Finished goods' },
								{ value: 'raw', label: 'Raw ingredients' },
								{ value: 'trading', label: 'Trading items' },
								{ value: 'bagged', label: 'Has bag weight' },
								{ value: 'inactive', label: 'Inactive' },
							]}
						/>
					</Space>
					<Table
						columns={columns}
						dataSource={filteredRows}
						loading={loading}
						rowKey="item_code"
						pagination={{ pageSize: 10 }}
						locale={{
							emptyText: (
								<Empty description="No items in the catalog. Add a finished product, raw ingredient, or bagged SKU." />
							),
						}}
					/>
				</Space>
			</div>

			<Modal
				title={editingItem ? `Edit ${editingItem.item_code}` : 'Add catalog item'}
				open={modalOpen}
				onCancel={() => {
					setModalOpen(false)
					form.resetFields()
				}}
				onOk={() => form.submit()}
				okText={editingItem ? 'Save item' : 'Add item'}
				confirmLoading={submitting}
				width={560}
				destroyOnClose
			>
				<Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 12 }}>
					<Form.Item
						name="item_code"
						label="Item code"
						rules={[{ required: true, message: 'Enter an item code, e.g. HG-02 or RSP-02.' }]}
					>
						<Input
							placeholder="HG-02"
							disabled={Boolean(editingItem)}
							style={{ fontFamily: "'Roboto Mono', monospace" }}
						/>
					</Form.Item>
					<Form.Item
						name="description"
						label="Description"
						rules={[{ required: true, message: 'Enter the product name as stored in the catalog.' }]}
					>
						<Input placeholder="GOLDMAS 12-12-18-2+TE (50KG)" />
					</Form.Item>
					<Form.Item
						name="item_category"
						label="Item category"
						rules={[{ required: true, message: 'Select how this item is used.' }]}
					>
						<Select
							placeholder="Select an item category"
							options={ITEM_CATEGORY_OPTIONS}
						/>
					</Form.Item>
					<Space style={{ display: 'flex' }} align="start">
						<Form.Item
							name="uom"
							label="UOM"
							rules={[{ required: true, message: 'Select a unit.' }]}
							style={{ width: 140 }}
						>
							<Select
								options={UOM_OPTIONS.map((uom) => ({ value: uom, label: uom }))}
							/>
						</Form.Item>
						<Form.Item name="bag_weight_kg" label="Bag weight (KG)" style={{ width: 180 }}>
							<InputNumber min={0.001} precision={3} style={{ width: '100%' }} placeholder="50" />
						</Form.Item>
						<Form.Item name="threshold_level" label="Reorder threshold" style={{ flex: 1 }}>
							<InputNumber min={0} precision={3} style={{ width: '100%' }} />
						</Form.Item>
					</Space>
				</Form>
			</Modal>
		</AppLayout>
	)
}

export default ItemManagement

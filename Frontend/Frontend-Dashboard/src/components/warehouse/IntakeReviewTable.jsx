import { useState, useEffect } from 'react'
import { Table, Tag, Button, Select, DatePicker, Space, Typography, App, Row, Col, theme } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import axios from 'axios'

import RejectModal from './RejectModal'

const { RangePicker } = DatePicker
const { Text }        = Typography

const STATUS_TAG = {
	pending:  { color: '#F3BC00', label: 'Pending',  textColor: '#0F3563' },
	verified: { color: 'success', label: 'Verified', textColor: undefined },
	rejected: { color: 'error',   label: 'Rejected', textColor: undefined },
}

function IntakeReviewTable() {
	const { token } = theme.useToken()
	const { message } = App.useApp()

	const [logs, setLogs]             = useState([])
	const [loading, setLoading]       = useState(true)
	const [actionLoading, setActionLoading] = useState(null)
	const [rejectTarget, setRejectTarget]   = useState(null)
	const [dateRange, setDateRange]   = useState(null)
	const [staffFilter, setStaffFilter] = useState(null)
	const [statusFilter, setStatusFilter] = useState(null)
	const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

	const fetchLogs = async () => {
		setLoading(true)
		try {
			const params = {}
			if (staffFilter)    params.submitted_by = staffFilter
			if (dateRange?.[0]) params.from         = dateRange[0].format('YYYY-MM-DD')
			if (dateRange?.[1]) params.to           = dateRange[1].format('YYYY-MM-DD')

			const res = await axios.get('/api/inventory/intake/pending', { params })
			const rawLogs = res.data.pending_intakes || []

			const normalizedLogs = rawLogs.map((row) => ({
				id: row.batch_code,
				batch_code: row.batch_code,
				entered_by_name: row.submitted_by || 'Warehouse Staff',
				intake_date: row.submitted_at ? String(row.submitted_at).split('T')[0] : '',
				po_number: row.batch_code,
				ca_number: row.hg_ca_number || '—',
				material: row.item_code,
				material_desc: row.description,
				qty_mt: row.quantity_mt,
				location: row.location,
				status: 'pending',
				variance_mt: row.variance_mt,
				hours_waiting: row.hours_waiting,
			}))

			const filteredLogs = statusFilter
				? normalizedLogs.filter((l) => l.status === statusFilter)
				: normalizedLogs

			setLogs(filteredLogs)
			setPagination((p) => ({ ...p, total: filteredLogs.length }))
		} catch (err) {
			console.error(err)
			message.error('Failed to load intake records.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => { fetchLogs() }, [dateRange, staffFilter, statusFilter, pagination.current]) // eslint-disable-line

	const handleVerify = async (id) => {
		setActionLoading(id)
		try {
			await axios.patch(`/api/inventory/intake/${encodeURIComponent(id)}/verify`)
			setLogs((prev) => prev.filter((l) => l.id !== id))
			message.success('Entry verified successfully.')
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to verify entry.')
		} finally {
			setActionLoading(null)
		}
	}

	const handleRejectConfirm = async (id, reason) => {
		setActionLoading(id)
		try {
			await axios.patch(`/api/inventory/intake/${encodeURIComponent(id)}/reject`, { reason })
			setLogs((prev) => prev.filter((l) => l.id !== id))
			setRejectTarget(null)
			message.success('Entry rejected.')
		} catch (err) {
			message.error(err.response?.data?.error || 'Failed to reject entry.')
		} finally {
			setActionLoading(null)
		}
	}

	const staffOptions = [...new Set(logs.map((l) => l.entered_by_name))].map(
		(name) => ({ value: name, label: name })
	)

	const columns = [
		{
			title: 'Staff Name',
			dataIndex: 'entered_by_name',
			key: 'entered_by_name',
			width: 160,
		},
		{
			title: 'Date',
			dataIndex: 'intake_date',
			key: 'intake_date',
			sorter: (a, b) => a.intake_date.localeCompare(b.intake_date),
			defaultSortOrder: 'descend',
			width: 110,
		},
		{
			title: 'PO / Batch',
			dataIndex: 'po_number',
			key: 'po_number',
			render: (v) => <span className="font-mono text-sm">{v}</span>,
			width: 150,
		},
		{
			title: 'CA Number',
			dataIndex: 'ca_number',
			key: 'ca_number',
			render: (v) => <span className="font-mono text-sm">{v}</span>,
			width: 130,
		},
		{ title: 'Material', dataIndex: 'material', key: 'material', width: 100 },
		{
			title: 'Qty (MT)',
			dataIndex: 'qty_mt',
			key: 'qty_mt',
			render: (v) => <span className="font-mono text-sm">{v}</span>,
			width: 90,
		},
		{ title: 'Location', dataIndex: 'location', key: 'location', width: 110 },
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			width: 100,
			render: (s) => {
				const cfg = STATUS_TAG[s] || { color: 'default', label: s }
				return (
					<Tag
						color={cfg.color}
						style={cfg.textColor ? { color: cfg.textColor, borderColor: cfg.color } : undefined}
					>
						{cfg.label}
					</Tag>
				)
			},
		},
		{
			title: 'Action',
			key: 'action',
			width: 160,
			fixed: 'right',
			render: (_, record) => {
				if (record.status !== 'pending') return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
				return (
					<Space size={6}>
						<Button
							type="primary"
							size="small"
							icon={<CheckOutlined />}
							loading={actionLoading === record.id}
							onClick={() => handleVerify(record.id)}
							style={{ background: token.colorSuccess, borderColor: token.colorSuccess }}
						>
							Verify
						</Button>
						<Button
							danger
							size="small"
							icon={<CloseOutlined />}
							loading={actionLoading === record.id}
							onClick={() => setRejectTarget(record)}
						>
							Reject
						</Button>
					</Space>
				)
			},
		},
	]

	return (
		<>
			<div
				style={{
					background: token.colorBgContainer,
					border: `1px solid ${token.colorBorderSecondary}`,
					borderRadius: token.borderRadiusLG,
					padding: 16,
					marginBottom: 16,
				}}
			>
				<Row gutter={[12, 12]} align="middle">
					<Col xs={24} sm={12} md={8}>
						<RangePicker
							onChange={setDateRange}
							placeholder={['From date', 'To date']}
							format="YYYY-MM-DD"
							style={{ width: '100%' }}
						/>
					</Col>
					<Col xs={24} sm={12} md={6}>
						<Select
							placeholder="Filter by staff"
							options={staffOptions}
							onChange={setStaffFilter}
							allowClear
							style={{ width: '100%' }}
						/>
					</Col>
					<Col xs={24} sm={12} md={5}>
						<Select
							placeholder="Filter by status"
							options={[
								{ value: 'pending',  label: 'Pending'  },
								{ value: 'verified', label: 'Verified' },
								{ value: 'rejected', label: 'Rejected' },
							]}
							onChange={setStatusFilter}
							allowClear
							style={{ width: '100%' }}
						/>
					</Col>
				</Row>
			</div>

			<Table
				rowKey="id"
				columns={columns}
				dataSource={logs}
				loading={loading}
				pagination={{
					...pagination,
					showSizeChanger: false,
					showTotal: (total) => `${total} entries`,
					onChange: (page) => setPagination((p) => ({ ...p, current: page })),
				}}
				size="middle"
				scroll={{ x: 900 }}
				locale={{ emptyText: 'No intake records found.' }}
			/>

			<RejectModal
				open={!!rejectTarget}
				intakeRecord={rejectTarget}
				onConfirm={handleRejectConfirm}
				onCancel={() => setRejectTarget(null)}
				loading={actionLoading === rejectTarget?.id}
			/>
		</>
	)
}

export default IntakeReviewTable

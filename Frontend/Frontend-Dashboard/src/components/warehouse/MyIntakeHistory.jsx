import { useState, useEffect, useContext } from 'react'
import { Table, Tag, DatePicker, Space, Typography, App, theme } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
// import axios from 'axios'

import { UserContext } from '../../global/UserContext'
import { MOCK_MY_INTAKE_LOGS } from '../../data/mockIntakeData'

const { RangePicker } = DatePicker
const { Text } = Typography

const STATUS_TAG = {
	pending:  { color: '#F3BC00', label: 'Pending',  textColor: '#0F3563' },
	verified: { color: 'success', label: 'Verified', textColor: undefined },
	rejected: { color: 'error',   label: 'Rejected', textColor: undefined },
}

const columns = [
	{
		title: 'Date',
		dataIndex: 'intake_date',
		key: 'intake_date',
		sorter: (a, b) => a.intake_date.localeCompare(b.intake_date),
		defaultSortOrder: 'descend',
	},
	{
		title: 'PO Number',
		dataIndex: 'po_number',
		key: 'po_number',
		render: (v) => <span className="font-mono text-sm">{v}</span>,
	},
	{
		title: 'CA Number',
		dataIndex: 'ca_number',
		key: 'ca_number',
		render: (v) => <span className="font-mono text-sm">{v}</span>,
	},
	{ title: 'Material', dataIndex: 'material', key: 'material' },
	{
		title: 'Qty (MT)',
		dataIndex: 'qty_mt',
		key: 'qty_mt',
		render: (v) => <span className="font-mono text-sm">{v}</span>,
	},
	{ title: 'Location', dataIndex: 'location', key: 'location' },
	{
		title: 'Status',
		dataIndex: 'status',
		key: 'status',
		filters: [
			{ text: 'Pending',  value: 'pending'  },
			{ text: 'Verified', value: 'verified' },
			{ text: 'Rejected', value: 'rejected' },
		],
		onFilter: (value, record) => record.status === value,
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
]

function MyIntakeHistory() {
	const { token } = theme.useToken()
	const { message } = App.useApp()
	const { user } = useContext(UserContext)
	const [logs, setLogs]       = useState([])
	const [loading, setLoading] = useState(true)
	const [dateRange, setDateRange] = useState(null)

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true)
			try {
				// ── Real call (enable once backend is ready) ──────────────
				// const params = { user_id: user?.id }
				// if (dateRange?.[0]) params.from = dateRange[0].format('YYYY-MM-DD')
				// if (dateRange?.[1]) params.to   = dateRange[1].format('YYYY-MM-DD')
				// const res = await axios.get('/api/intake/logs', { params })
				// setLogs(res.data.logs ?? [])

				// ── Mock data ─────────────────────────────────────────────
				setLogs(MOCK_MY_INTAKE_LOGS)
			} catch {
				message.error('Failed to load intake history.')
			} finally {
				setLoading(false)
			}
		}
		fetchLogs()
	}, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-2">
					<HistoryOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
					<Text strong style={{ fontSize: 15 }}>My Intake Submissions</Text>
				</div>

				<Space wrap>
					<RangePicker
						onChange={setDateRange}
						placeholder={['From date', 'To date']}
						format="YYYY-MM-DD"
					/>
				</Space>
			</div>

			<Text type="secondary" style={{ fontSize: 13 }}>
				Your personal history of submitted intake records. Check the status column to see
				if a supervisor has verified or rejected each entry.
			</Text>

			<Table
				rowKey="id"
				columns={columns}
				dataSource={logs}
				loading={loading}
				pagination={{ pageSize: 10, showSizeChanger: false }}
				size="middle"
				scroll={{ x: 600 }}
				locale={{ emptyText: 'No intake records found for this period.' }}
			/>
		</div>
	)
}

export default MyIntakeHistory

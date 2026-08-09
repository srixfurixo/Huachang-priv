import { Table, Tag, Typography, Alert, theme } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'

const { Text } = Typography

const STATUS_COLOR = { open: 'green', partial: 'gold', closed: 'default' }

const columns = [
	{
		title: 'PO Number',
		dataIndex: 'po_number',
		key: 'po_number',
		render: (v) => <span className="font-mono text-sm">{v}</span>,
	},
	{ title: 'PO Date', dataIndex: 'po_date', key: 'po_date' },
	{ title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
	{
		title: 'Material',
		key: 'material',
		render: (_, r) => (
			<span>
				<Text strong>{r.material_code}</Text>
				<Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>
					{r.material_name}
				</Text>
			</span>
		),
	},
	{
		title: 'Ordered (MT)',
		dataIndex: 'qty_mt',
		key: 'qty_mt',
		render: (v) => <span className="font-mono text-sm">{v}</span>,
	},
	{
		title: 'Balance (MT)',
		dataIndex: 'balance_mt',
		key: 'balance_mt',
		render: (v) => <span className="font-mono text-sm font-semibold">{v}</span>,
	},
	{
		title: 'Status',
		dataIndex: 'status',
		key: 'status',
		render: (s) => (
			<Tag color={STATUS_COLOR[s] || 'default'}>{s.toUpperCase()}</Tag>
		),
	},
]

function PoSelectStep({ pos, loading, selectedPo, onSelect }) {
	const { token } = theme.useToken()

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 mb-1">
				<FileTextOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
				<Text strong style={{ fontSize: 15 }}>
					Select an open Purchase Order
				</Text>
			</div>

			<Text type="secondary" style={{ fontSize: 13 }}>
				Click a row to select the PO this intake will be recorded against.
				Only POs with remaining balance are shown.
			</Text>

			<Table
				rowKey="id"
				columns={columns}
				dataSource={pos}
				loading={loading}
				pagination={{ pageSize: 8, showSizeChanger: false }}
				size="middle"
				rowClassName={(r) =>
					r.id === selectedPo?.id ? 'ant-table-row-selected cursor-pointer' : 'cursor-pointer'
				}
				onRow={(record) => ({
					onClick: () => onSelect(record),
					style: {
						background:
							record.id === selectedPo?.id
								? `${token.colorPrimary}12`
								: undefined,
					},
				})}
				scroll={{ x: 600 }}
			/>

			{selectedPo && (
				<Alert
					type="success"
					showIcon
					message={
						<span>
							Selected:{' '}
							<Text strong className="font-mono">
								{selectedPo.po_number}
							</Text>{' '}
							— {selectedPo.material_code} · Balance{' '}
							<Text strong className="font-mono">
								{selectedPo.balance_mt} MT
							</Text>
						</span>
					}
				/>
			)}
		</div>
	)
}

export default PoSelectStep

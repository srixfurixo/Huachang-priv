import { Table, Tag, Typography, Alert, theme } from 'antd'
import { ContainerOutlined, WarningOutlined } from '@ant-design/icons'

const { Text } = Typography

function isExpired(validUntil) {
	return validUntil && new Date(validUntil) < new Date()
}

function hoursRemaining(validUntil) {
	if (!validUntil) return null
	const diff = new Date(validUntil) - new Date()
	return Math.max(0, Math.round(diff / (1000 * 60 * 60) * 10) / 10)
}

function CaSelectStep({ cas, loading, selectedCa, onSelect }) {
	const { token } = theme.useToken()

	const columns = [
		{
			title: 'CA Number',
			dataIndex: 'ca_number',
			key: 'ca_number',
			render: (v) => <span className="font-mono text-sm">{v}</span>,
		},
		{ title: 'CA Date', dataIndex: 'ca_date', key: 'ca_date' },
		{
			title: 'Qty (MT)',
			dataIndex: 'qty_mt',
			key: 'qty_mt',
			render: (v) => <span className="font-mono text-sm font-semibold">{v}</span>,
		},
		{ title: 'Lorry No.', dataIndex: 'lorry_number', key: 'lorry_number',
			render: (v) => <span className="font-mono text-sm">{v || '—'}</span> },
		{ title: 'Location', dataIndex: 'location', key: 'location' },
		{ title: 'Supp. CA Ref', dataIndex: 'supp_ca_ref', key: 'supp_ca_ref',
			render: (v) => <span className="font-mono text-sm">{v || '—'}</span> },
		{
			title: 'Valid Until',
			dataIndex: 'valid_until',
			key: 'valid_until',
			render: (v) => {
				if (!v) return '—'
				const expired = isExpired(v)
				const hrs = hoursRemaining(v)
				return (
					<Tag
						color={expired ? 'error' : hrs <= 3 ? 'warning' : 'success'}
						icon={expired ? <WarningOutlined /> : null}
					>
						{expired
							? 'EXPIRED'
							: `${hrs}h remaining`}
					</Tag>
				)
			},
		},
	]

	const expiredCasInList = cas.filter((c) => isExpired(c.valid_until))

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 mb-1">
				<ContainerOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
				<Text strong style={{ fontSize: 15 }}>
					Select a Collection Advice
				</Text>
			</div>

			<Text type="secondary" style={{ fontSize: 13 }}>
				CAs are valid for 12 hours from issue date. Confirm with the external warehouse
				before collecting against an expired CA.
			</Text>

			{expiredCasInList.length > 0 && (
				<Alert
					type="warning"
					showIcon
					message={`${expiredCasInList.length} expired CA(s) shown — contact the supplier to renew before collecting.`}
				/>
			)}

			<Table
				rowKey="id"
				columns={columns}
				dataSource={cas}
				loading={loading}
				pagination={{ pageSize: 8, showSizeChanger: false }}
				size="middle"
				rowClassName={(r) =>
					r.id === selectedCa?.id ? 'ant-table-row-selected cursor-pointer' : 'cursor-pointer'
				}
				onRow={(record) => ({
					onClick: () => onSelect(record),
					style: {
						background:
							record.id === selectedCa?.id
								? `${token.colorPrimary}12`
								: undefined,
						opacity: isExpired(record.valid_until) ? 0.6 : 1,
					},
				})}
				scroll={{ x: 700 }}
			/>

			{selectedCa && isExpired(selectedCa.valid_until) && (
				<Alert
					type="error"
					showIcon
					message="This CA has expired. You can still record the intake, but ensure you have an updated authorization from the supplier."
				/>
			)}

			{selectedCa && !isExpired(selectedCa.valid_until) && (
				<Alert
					type="success"
					showIcon
					message={
						<span>
							Selected:{' '}
							<Text strong className="font-mono">
								{selectedCa.ca_number}
							</Text>{' '}
							· {selectedCa.qty_mt} MT ·{' '}
							<Text strong>{selectedCa.location}</Text>
						</span>
					}
				/>
			)}
		</div>
	)
}

export default CaSelectStep

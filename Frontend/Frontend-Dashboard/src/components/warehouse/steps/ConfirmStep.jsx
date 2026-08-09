import { Descriptions, Tag, Typography, Divider, theme } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

function ConfirmStep({ selectedPo, selectedCa, deliveryDetails, locations }) {
	const { token } = theme.useToken()

	const locationName =
		locations.find((l) => l.id === deliveryDetails?.location_id)?.name ||
		deliveryDetails?.location_id ||
		'—'

	const items = [
		{ key: 'po_number',     label: 'Purchase Order',    children: <span className="font-mono">{selectedPo?.po_number || '—'}</span> },
		{ key: 'supplier',      label: 'Supplier',          children: selectedPo?.supplier || '—' },
		{ key: 'material',      label: 'Material',          children: `${selectedPo?.material_code} — ${selectedPo?.material_name}` },
		{ key: 'ca_number',     label: 'Collection Advice', children: <span className="font-mono">{selectedCa?.ca_number || '—'}</span> },
		{ key: 'supp_ca_ref',   label: 'Supplier CA Ref',   children: <span className="font-mono">{selectedCa?.supp_ca_ref || '—'}</span> },
		{ key: 'divider', label: '', children: <Divider style={{ margin: '4px 0' }} /> },
		{ key: 'qty_mt',        label: 'Received Qty (MT)', children: <Text strong className="font-mono">{deliveryDetails?.qty_mt ?? '—'}</Text> },
		{ key: 'batch_number',  label: 'Batch / Origin',    children: <span className="font-mono">{deliveryDetails?.batch_number || '—'}</span> },
		{ key: 'location',      label: 'Storage Location',  children: locationName },
		{ key: 'received_date', label: 'Received Date',     children: deliveryDetails?.received_date?.format('YYYY-MM-DD') || '—' },
		{ key: 'lorry_number',  label: 'Lorry No.',         children: <span className="font-mono">{deliveryDetails?.lorry_number || '—'}</span> },
		{ key: 'driver_name',   label: 'Driver Name',       children: deliveryDetails?.driver_name || '—' },
		{ key: 'driver_ic',     label: 'Driver IC',         children: <span className="font-mono">{deliveryDetails?.driver_ic || '—'}</span> },
		{ key: 'notes',         label: 'Notes',             children: deliveryDetails?.notes || '—', span: 2 },
	]

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 mb-1">
				<CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 16 }} />
				<Text strong style={{ fontSize: 15 }}>
					Review and Confirm
				</Text>
			</div>

			<Text type="secondary" style={{ fontSize: 13 }}>
				Check all details below before submitting. This record will be sent to your
				supervisor for verification.
			</Text>

			<div
				style={{
					background: token.colorBgContainer,
					border: `1px solid ${token.colorBorderSecondary}`,
					borderRadius: token.borderRadiusLG,
					padding: 24,
				}}
			>
				<Tag color="processing" style={{ marginBottom: 16 }}>
					Pending supervisor verification
				</Tag>

				<Descriptions
					column={{ xs: 1, sm: 2 }}
					size="small"
					bordered
					items={items.filter((i) => i.key !== 'divider')}
					labelStyle={{ fontWeight: 600, fontSize: 13, width: 160 }}
					contentStyle={{ fontSize: 13 }}
				/>
			</div>
		</div>
	)
}

export default ConfirmStep

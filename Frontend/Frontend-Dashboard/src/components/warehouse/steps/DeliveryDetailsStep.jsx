import { useEffect } from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Typography, theme } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography
const { TextArea } = Input

function DeliveryDetailsStep({ form, selectedCa, locations, onSaveDetails, initialValues }) {
	const { token } = theme.useToken()

	useEffect(() => {
		if (initialValues) {
			form.setFieldsValue(initialValues)
		} else {
			form.setFieldsValue({
				lorry_number: selectedCa?.lorry_number || '',
				driver_name: selectedCa?.driver_name || '',
				received_date: dayjs(),
			})
		}
	}, [initialValues, selectedCa, form])

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2 mb-1">
				<InboxOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
				<Text strong style={{ fontSize: 15 }}>
					Delivery &amp; Receipt Details
				</Text>
			</div>

			<Text type="secondary" style={{ fontSize: 13 }}>
				Confirm the lorry and driver details, enter the actual received quantity,
				and select the storage location.
			</Text>

			<Form
				form={form}
				layout="vertical"
				requiredMark={false}
				size="large"
				className="mt-2"
				onValuesChange={(_, allValues) => {
					if (onSaveDetails) {
						onSaveDetails(allValues)
					}
				}}
			>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
					<Form.Item
						name="lorry_number"
						label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Lorry Number</Text>}
						rules={[{ required: true, message: 'Lorry number is required.' }]}
					>
						<Input
							placeholder="e.g. BEL 9741"
							maxLength={20}
							className="font-mono"
						/>
					</Form.Item>

					<Form.Item
						name="driver_name"
						label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Driver Name</Text>}
						rules={[{ required: true, message: 'Driver name is required.' }]}
					>
						<Input placeholder="Full name" maxLength={100} />
					</Form.Item>

					<Form.Item
						name="driver_ic"
						label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Driver IC No.</Text>}
					>
						<Input
							placeholder="e.g. 920603-08-5827"
							maxLength={20}
							className="font-mono"
						/>
					</Form.Item>

					<Form.Item
						name="received_date"
						label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Received Date</Text>}
						rules={[{ required: true, message: 'Received date is required.' }]}
					>
						<DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
					</Form.Item>

					<Form.Item
						name="qty_mt"
						label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Actual Received Qty (MT)</Text>}
						rules={[
							{ required: true, message: 'Received quantity is required.' },
							{ type: 'number', min: 0.001, message: 'Must be greater than 0.' },
						]}
					>
						<InputNumber
							style={{ width: '100%' }}
							placeholder="e.g. 30.5"
							precision={3}
							min={0.001}
							className="font-mono"
						/>
					</Form.Item>

					<Form.Item
						name="location_id"
						label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Storage Location</Text>}
						rules={[{ required: true, message: 'Storage location is required.' }]}
					>
						<Select
							placeholder="Select location"
							options={(locations || []).map((l) => ({
								value: l.id,
								label: (
									<span>
										{l.name}
										<Text
											type="secondary"
											style={{ marginLeft: 8, fontSize: 11 }}
										>
											{(l.location_type || l.type) === 'internal'
												? '(Internal)'
												: '(External)'}
										</Text>
									</span>
								),
							}))}
							showSearch
							filterOption={(input, option) =>
								option?.label?.props?.children[0]
									?.toLowerCase()
									.includes(input.toLowerCase())
							}
						/>
					</Form.Item>
				</div>

				<Form.Item
					name="batch_number"
					label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Batch / Origin Reference</Text>}
				>
					<Input
						placeholder="e.g. 207546 or leave blank if not applicable"
						maxLength={50}
						className="font-mono"
					/>
				</Form.Item>

				<Form.Item
					name="notes"
					label={<Text style={{ fontSize: 12, fontWeight: 600 }}>Notes / Remarks</Text>}
				>
					<TextArea
						placeholder="Any remarks about this delivery (e.g. condition of goods, short delivery, etc.)"
						rows={3}
						maxLength={500}
						showCount
					/>
				</Form.Item>
			</Form>
		</div>
	)
}

export default DeliveryDetailsStep
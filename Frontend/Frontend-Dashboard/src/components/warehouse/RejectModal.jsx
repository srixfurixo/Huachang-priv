import { Modal, Form, Input, Typography, theme } from 'antd'
import { WarningOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

function RejectModal({ open, intakeRecord, onConfirm, onCancel, loading }) {
	const { token } = theme.useToken()
	const [form] = Form.useForm()

	const handleOk = async () => {
		try {
			const values = await form.validateFields()
			onConfirm(intakeRecord?.id, values.reason)
			form.resetFields()
		} catch {
			// validation errors shown inline
		}
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			open={open}
			title={
				<div className="flex items-center gap-2">
					<WarningOutlined style={{ color: token.colorError }} />
					<span>Reject Intake Entry</span>
				</div>
			}
			onOk={handleOk}
			onCancel={handleCancel}
			okText="Confirm Rejection"
			cancelText="Cancel"
			okButtonProps={{ danger: true, loading }}
			destroyOnClose
		>
			{intakeRecord && (
				<div
					style={{
						background: token.colorFillAlter,
						borderRadius: token.borderRadius,
						padding: '10px 14px',
						marginBottom: 16,
					}}
				>
					<Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
						Rejecting entry by
					</Text>
					<Text strong>{intakeRecord.entered_by_name}</Text>
					<Text type="secondary" style={{ marginLeft: 8 }}>
						· {intakeRecord.material} · {intakeRecord.qty_mt} MT ·{' '}
						<span className="font-mono">{intakeRecord.ca_number}</span>
					</Text>
				</div>
			)}

			<Form form={form} layout="vertical" requiredMark={false}>
				<Form.Item
					name="reason"
					label={<Text style={{ fontSize: 13, fontWeight: 600 }}>Reason for Rejection</Text>}
					rules={[{ required: true, message: 'Please provide a reason for the rejection.' }]}
				>
					<TextArea
						placeholder="Describe why this intake entry is being rejected (e.g. incorrect quantity, wrong CA reference, lorry plate mismatch)."
						rows={4}
						maxLength={300}
						showCount
					/>
				</Form.Item>
			</Form>
		</Modal>
	)
}

export default RejectModal

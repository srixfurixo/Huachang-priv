import { Typography, Row, Col, theme, App } from 'antd'
import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	ClockCircleOutlined,
} from '@ant-design/icons'

import AppLayout from '../../components/layout/AppLayout'
import StatCard from '../../components/common/StatCard'
import IntakeReviewTable from '../../components/warehouse/IntakeReviewTable'
import { MOCK_ALL_INTAKE_LOGS } from '../../data/mockIntakeData'

const { Title, Text } = Typography

function IntakeReviewPage() {
	const { token } = theme.useToken()

	const total    = MOCK_ALL_INTAKE_LOGS.length
	const pending  = MOCK_ALL_INTAKE_LOGS.filter((l) => l.status === 'pending').length
	const verified = MOCK_ALL_INTAKE_LOGS.filter((l) => l.status === 'verified').length
	const rejected = MOCK_ALL_INTAKE_LOGS.filter((l) => l.status === 'rejected').length

	return (
		<App>
			<AppLayout breadcrumbs={['Warehouse', 'Intake Verification']}>
				<div className="mb-6">
					<Title
						level={2}
						style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}
					>
						Intake Verification
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Review and verify material intake records submitted by warehouse staff.
					</Text>
				</div>

				<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
					<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
						<StatCard
							icon={<ClockCircleOutlined />}
							label="Pending Verification"
							value={pending}
							subtitle={`Out of ${total} total entries`}
							alert={pending > 0 ? `${pending} awaiting review` : undefined}
							iconBg={`#F3BC0022`}
							iconColor="#F3BC00"
						/>
					</Col>
					<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
						<StatCard
							icon={<CheckCircleOutlined />}
							label="Verified"
							value={verified}
							subtitle="Confirmed by supervisor"
							iconBg={`${token.colorSuccess}18`}
							iconColor={token.colorSuccess}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6} style={{ display: 'flex' }}>
						<StatCard
							icon={<CloseCircleOutlined />}
							label="Rejected"
							value={rejected}
							subtitle="Returned to staff"
							iconBg={`${token.colorError}12`}
							iconColor={token.colorError}
						/>
					</Col>
				</Row>

				<div
					style={{
						background: token.colorBgContainer,
						borderRadius: token.borderRadiusLG,
						border: `1px solid ${token.colorBorderSecondary}`,
						padding: 24,
					}}
				>
					<IntakeReviewTable />
				</div>
			</AppLayout>
		</App>
	)
}

export default IntakeReviewPage

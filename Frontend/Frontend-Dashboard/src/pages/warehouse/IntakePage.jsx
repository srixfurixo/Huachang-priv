import { Typography, Tabs, theme, App } from 'antd'
import { ImportOutlined, HistoryOutlined } from '@ant-design/icons'

import AppLayout from '../../components/layout/AppLayout'
import IntakeWizard from '../../components/warehouse/IntakeWizard'
import MyIntakeHistory from '../../components/warehouse/MyIntakeHistory'

const { Title, Text } = Typography

const TAB_ITEMS = [
	{
		key: 'new-intake',
		label: (
			<span className="flex items-center gap-1.5">
				<ImportOutlined />
				New Intake
			</span>
		),
		children: <IntakeWizard />,
	},
	{
		key: 'my-history',
		label: (
			<span className="flex items-center gap-1.5">
				<HistoryOutlined />
				My History
			</span>
		),
		children: <MyIntakeHistory />,
	},
]

function IntakePage() {
	const { token } = theme.useToken()

	return (
		<App>
			<AppLayout breadcrumbs={['Warehouse', 'Raw Material Intake']}>
				<div className="mb-6">
					<Title
						level={2}
						style={{ margin: 0, fontSize: 24, fontWeight: 700, color: token.colorTextHeading }}
					>
						Raw Material Intake
					</Title>
					<Text style={{ color: token.colorTextSecondary, marginTop: 4, display: 'block' }}>
						Record incoming deliveries against open purchase orders and view your submission history.
					</Text>
				</div>

				<div
					style={{
						background: token.colorBgContainer,
						borderRadius: token.borderRadiusLG,
						border: `1px solid ${token.colorBorderSecondary}`,
						padding: '0 24px 24px',
					}}
				>
					<Tabs
						defaultActiveKey="new-intake"
						items={TAB_ITEMS}
						size="large"
						style={{ paddingTop: 4 }}
					/>
				</div>
			</AppLayout>
		</App>
	)
}

export default IntakePage

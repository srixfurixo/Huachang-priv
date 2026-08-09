import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
	Form,
	Input,
	Button,
	Checkbox,
	Alert,
	Typography,
	Space,
	App,
	theme,
} from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import axios from 'axios'
import { sanitizeInput } from '../../utils/sanitizeInput'
import { getDefaultHomePath } from '../../config/navConfig'
import { UserContext } from '../../global/UserContext'
import logo from '../../assets/images/logos/logo.svg'

const { Title, Text } = Typography

function LoginForm() {
	const [form] = Form.useForm()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const navigate = useNavigate()
	const { message } = App.useApp()
	const { token } = theme.useToken()
	const { login } = useContext(UserContext)

	const handleFinish = async (values) => {
		setError('')
		setLoading(true)

		const sanitizedEmail = sanitizeInput(values.email)
		const sanitizedPassword = sanitizeInput(values.password)

		try {
			const response = await axios.post('/api/auth/login', {
				passed_in_username: sanitizedEmail,
				passed_in_password: sanitizedPassword,
			})

			if (response.data.success) {
				login(response.data.user)
				message.success(`Welcome back, ${response.data.user.first_name}!`)
				navigate(getDefaultHomePath(response.data.user.role))
			} else {
				setError(
					response.data.message ||
						'Login failed. Please check your credentials and try again.',
				)
			}
		} catch {
			setError('Unable to connect. Please try again or contact your administrator.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div style={{ width: '100%', maxWidth: 354 }}>
			<Space align="center" style={{ marginBottom: 40 }} size={11}>
				<img
					src={logo}
					alt="Huachang Growmax"
					style={{ width: 25, height: 25, objectFit: 'contain' }}
				/>
				<div>
					<Title
						level={4}
						style={{
							margin: 0,
							color: '#0b1c30',
							fontSize: 22,
							fontWeight: 900,
							letterSpacing: '1.1px',
							textTransform: 'uppercase',
						}}
					>
						Huachang Growmax
					</Title>
					<Text style={{ fontSize: 13, color: '#64748b', marginLeft: 1 }}>
						Operations Control Portal
					</Text>
				</div>
			</Space>

			{error && (
				<Alert
					title={error}
					type="error"
					showIcon
					closable={{ onClose: () => setError('') }}
					style={{ marginBottom: 20, borderRadius: token.borderRadius }}
				/>
			)}

			<Form
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				requiredMark={false}
				size="large"
			>
				<Form.Item
					name="email"
					label={
						<Text style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
							Email Address
						</Text>
					}
					rules={[
						{ required: true, message: 'Please enter your email address.' },
						{ type: 'email', message: 'Please enter a valid email address.' },
					]}
				>
					<Input
						prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />}
						placeholder="manager@huachang.com"
						maxLength={100}
						style={{ height: 49, background: '#f8f9ff', borderColor: '#d1d9d4' }}
					/>
				</Form.Item>

				<Form.Item
					name="password"
					label={
						<Text style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
							Password
						</Text>
					}
					rules={[{ required: true, message: 'Please enter your password.' }]}
				>
					<Input.Password
						prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />}
						placeholder="Enter your password"
						maxLength={72}
						style={{ height: 49, background: '#f8f9ff', borderColor: '#d1d9d4' }}
					/>
				</Form.Item>

				<Form.Item style={{ marginBottom: 20 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Form.Item name="remember" valuePropName="checked" noStyle>
							<Checkbox>
								<Text style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
									Remember me
								</Text>
							</Checkbox>
						</Form.Item>
						<Link
							to="/auth/forgot-password"
							style={{ fontSize: 12, fontWeight: 600, color: token.colorPrimary }}
						>
							Forgot password?
						</Link>
					</div>
				</Form.Item>

				<Form.Item style={{ marginBottom: 12 }}>
					<Button
						type="primary"
						htmlType="submit"
						block
						loading={loading}
						style={{
							height: 50,
							fontSize: 15,
							fontWeight: 700,
							borderRadius: 9,
							letterSpacing: '0.15px',
						}}
					>
						Sign In to Dashboard
					</Button>
				</Form.Item>

				<div style={{ textAlign: 'center' }}>
					<Text style={{ fontSize: 13, color: '#64748b' }}>Need access? </Text>
					<Text
						style={{
							fontSize: 14,
							fontWeight: 700,
							color: token.colorPrimary,
							cursor: 'pointer',
						}}
					>
						Contact Administrator
					</Text>
				</div>
			</Form>
		</div>
	)
}

export default LoginForm

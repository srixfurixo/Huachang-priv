import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { UserContext } from '../../global/UserContext'
import { getDefaultHomePath } from '../../config/navConfig'

function UnauthorizedPage() {
	const navigate = useNavigate()
	const { user } = useContext(UserContext)
	const homePath = getDefaultHomePath(user?.role)

	return (
		<Result
			status="403"
			title="Access denied"
			subTitle="You do not have permission to view this page."
			extra={[
				<Button type="primary" key="home" onClick={() => navigate(homePath)}>
					Go to my dashboard
				</Button>,
				<Button key="login" onClick={() => navigate('/auth/login')}>
					Back to login
				</Button>,
			]}
		/>
	)
}

export default UnauthorizedPage

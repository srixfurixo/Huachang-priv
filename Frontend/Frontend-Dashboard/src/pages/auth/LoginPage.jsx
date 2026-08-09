import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout'
import LoginForm from '../../components/auth/LoginForm'
import { UserContext } from '../../global/UserContext'

function LoginPage() {
  const { user, loading } = useContext(UserContext)

  if (loading) {
    return null
  }

  if (user) {
    const redirectPath = user.role === 'Admin' ? '/admin/users' : '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
export default LoginPage
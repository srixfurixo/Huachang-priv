import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/auth/LoginPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import AdminPage from '../pages/admin/adminPage'
import ManagerPage from '../pages/manager/ManagerPage'
import WarehousePage from '../pages/warehouse/WarehousePage'
import ProtectedRoutes from '../utils/protectedRoutes'
import DashboardPage from '../pages/shared/DashboardPage'

import InventoryDashboard from '../pages/InventoryDashboard'

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/auth/login" />} />

            <Route path="/inventory-dashboard" element={<InventoryDashboard />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            <Route
                path="/admin/*"
                element={
                    <ProtectedRoutes allowRoles={['Admin']}>
                        <AdminPage />
                    </ProtectedRoutes>
                }
            />

            <Route
                path="/operations/*"
                element={
                    <ProtectedRoutes
                        allowRoles={[
                            'Admin',
                            'Manager',
                            'Warehouse_Supervisor',
                            'Warehouse_Employee',
                            'Delivery_Supervisor',
                            'Delivery_Driver',
                        ]}
                    >
                        <ManagerPage />
                    </ProtectedRoutes>
                }
            />

            {/* SP3: Warehouse routes — Supervisors, Employees, and Admin */}
            <Route
                path="/warehouse/*"
                element={
                    <ProtectedRoutes
                        allowRoles={['Admin', 'Warehouse_Supervisor', 'Warehouse_Employee']}
                    >
                        <WarehousePage />
                    </ProtectedRoutes>
                }
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoutes
                        allowRoles={[
                            'Manager',
                            'Warehouse_Supervisor',
                            'Warehouse_Employee',
                            'Delivery_Supervisor',
                            'Delivery_Driver',
                        ]}
                    >
                        <DashboardPage />
                    </ProtectedRoutes>
                }
            />
        </Routes>
    )
}
export default AppRoutes

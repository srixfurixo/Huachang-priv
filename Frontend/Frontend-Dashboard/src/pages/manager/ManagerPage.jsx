import { Routes, Route, Navigate } from 'react-router-dom'
import OperationalOverview from './views/OperationalOverview'
import InventoryDashboard from '../InventoryDashboard'
import InventoryOverview from './views/InventoryOverview'
import PurchaseOrders from './views/PurchaseOrders'
import SalesOrders from './views/SalesOrders' 
import CollectionAdvice from './views/CollectionAdvice'
import IntakeLog from './views/IntakeLog'

function ManagerPage() {
	return (
		<Routes>
			<Route index element={<Navigate to="/operations/overview" replace />} />
			<Route path="overview" element={<InventoryDashboard />} />
			<Route path="inventory" element={<InventoryOverview />} />
			<Route path="purchase-orders" element={<PurchaseOrders />} />
			<Route path="sales-orders" element={<SalesOrders />} /> 
			<Route path="collection" element={<CollectionAdvice />} />
			<Route path="intake-log" element={<IntakeLog />} />
			<Route path="*" element={<Navigate to="/operations/overview" replace />} />
		</Routes>
	)
}

export default ManagerPage
import { useLocation, Routes, Route, Navigate } from 'react-router-dom'

import IntakePage       from './IntakePage'
import IntakeReviewPage from './IntakeReviewPage'
import ModulePlaceholderPage from '../shared/ModulePlaceholderPage'

/**
 * WarehousePage — routing table for the `/warehouse/*` subtree.
 * Mounted by AppRoutes behind a role guard (Warehouse_Supervisor,
 * Warehouse_Employee, Admin).
 *
 * SP3 live routes: /warehouse/intake, /warehouse/intake-review
 * Future routes (placeholders): /warehouse/tasks, /warehouse/inventory,
 *   /warehouse/my-tasks, /warehouse/analytics, /warehouse/progress
 */
function WarehousePage() {
	const location = useLocation()

	return (
		<Routes>
			<Route index element={<Navigate to="intake" replace />} />

			{/* SP3: Material Intake — Warehouse_Employee */}
			<Route path="intake" element={<IntakePage />} />

			{/* SP3: Supervisor Intake Review — Warehouse_Supervisor */}
			<Route path="intake-review" element={<IntakeReviewPage />} />

			{/* Future sprint placeholders */}
			<Route path="tasks"        element={<ModulePlaceholderPage pathname="/warehouse/tasks" />} />
			<Route path="inventory"    element={<ModulePlaceholderPage pathname="/warehouse/inventory" />} />
			<Route path="my-tasks"     element={<ModulePlaceholderPage pathname="/warehouse/my-tasks" />} />
			<Route path="analytics"    element={<ModulePlaceholderPage pathname="/warehouse/analytics" />} />
			<Route path="progress"     element={<ModulePlaceholderPage pathname="/warehouse/progress" />} />

			<Route path="*" element={<Navigate to="intake" replace />} />
		</Routes>
	)
}

export default WarehousePage

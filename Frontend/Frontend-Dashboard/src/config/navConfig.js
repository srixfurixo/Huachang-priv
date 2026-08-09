/**
 * Unified sidebar + route RBAC map.
 * Admin sees every item; other roles see only entries that include their role.
 */

export const ROLE_HOME = {
	Admin: '/admin/users',
	Manager: '/operations/overview',
	Warehouse_Supervisor: '/warehouse/tasks',
	Warehouse_Employee: '/warehouse/my-tasks',
	Delivery_Supervisor: '/logistics/dispatch',
	Delivery_Driver: '/logistics/my-route',
}

/** @typedef {'desktop' | 'field'} LayoutVariant */

/**
 * @type {Array<{
 *   key: string
 *   label: string
 *   section: string
 *   roles: string[]
 *   description: string
 *   layout: LayoutVariant
 * }>}
 */
export const NAV_ITEMS = [
	// ── Operations (Admin + Manager) ────────────────────────────────
	{
		key: '/operations/overview',
		label: 'Inventory Dashboard',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee', 'Delivery_Supervisor', 'Delivery_Driver'],
		description: 'Stock monitoring, ATP metrics, aging buckets, and command center.',
		layout: 'desktop',
	},
	{
		key: '/operations/inventory',
		label: 'Inventory & Purchasing',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager'],
		description: 'Stock monitoring across locations and purchase order workflows.',
		layout: 'desktop',
	},
	{
		key: '/operations/dispatch',
		label: 'Task Dispatch Board',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager'],
		description: 'Assign warehouse and delivery tasks from incoming purchase orders.',
		layout: 'desktop',
	},
	{
		key: '/operations/purchase-orders',
		label: 'Purchase Orders',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager'],
		description: 'Raise purchase orders to suppliers and track their sales order responses.',
		layout: 'desktop',
	},
	{
		key: '/operations/sales-orders',
		label: 'Sales Orders',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager'],
		description: 'Log sales order commitments from customers and track outbound capacities.',
		layout: 'desktop',
	},
	{
		key: '/operations/collection',
		label: 'Collection Advice',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager'],
		description: 'Track incoming delivery batches against open purchase orders until each PO is fully received.',
		layout: 'desktop',
	},
	{
		key: '/operations/intake-log',
		label: 'Intake / Outtake Log',
		section: 'OPERATIONS',
		roles: ['Admin', 'Manager'],
		description: 'Review material intake entered by floor staff alongside outgoing dispatch records.',
		layout: 'desktop',
	},

	// ── Warehouse (Supervisor + Staff) ──────────────────────────────
	{
		key: '/warehouse/tasks',
		label: 'Task Board',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Supervisor'],
		description: 'Accept, view, and assign mixing and packaging jobs to floor staff.',
		layout: 'desktop',
	},
	{
		key: '/warehouse/inventory',
		label: 'Inventory View',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Supervisor'],
		description: 'Read-only view of raw material quantities and finished product counts.',
		layout: 'desktop',
	},
	{
		key: '/warehouse/intake-review',
		label: 'Intake Verification',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Supervisor'],
		description: 'Authorize and verify inbound delivery logs after floor staff entry.',
		layout: 'desktop',
	},
	{
		key: '/warehouse/analytics',
		label: 'Floor Analytics',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Supervisor'],
		description: 'Track pending, active, and completed warehouse jobs.',
		layout: 'desktop',
	},
	{
		key: '/warehouse/intake',
		label: 'Raw Material Intake',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Employee'],
		description: 'Log incoming batch quantities, item codes, units, and expiration details.',
		layout: 'field',
	},
	{
		key: '/warehouse/my-tasks',
		label: 'My Tasks',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Employee'],
		description: 'View personally assigned mixing or packaging jobs.',
		layout: 'field',
	},
	{
		key: '/warehouse/progress',
		label: 'Progress Logger',
		section: 'WAREHOUSE',
		roles: ['Admin', 'Warehouse_Employee'],
		description: 'Update assignment status from In Progress to Completed.',
		layout: 'field',
	},

	// ── Logistics (Delivery roles) ──────────────────────────────────
	{
		key: '/logistics/dispatch',
		label: 'Delivery Dispatch',
		section: 'LOGISTICS',
		roles: ['Admin', 'Delivery_Supervisor'],
		description: 'Assign product batches, instructions, and transit routes to drivers.',
		layout: 'desktop',
	},
	{
		key: '/logistics/transit',
		label: 'Transit Monitor',
		section: 'LOGISTICS',
		roles: ['Admin', 'Delivery_Supervisor'],
		description: 'Live visibility of active shipments and delivery milestones.',
		layout: 'desktop',
	},
	{
		key: '/logistics/history',
		label: 'Dispatch History',
		section: 'LOGISTICS',
		roles: ['Admin', 'Delivery_Supervisor'],
		description: 'Archive of completed dispatches and resolved drop-offs.',
		layout: 'desktop',
	},
	{
		key: '/logistics/my-route',
		label: 'My Route',
		section: 'LOGISTICS',
		roles: ['Admin', 'Delivery_Driver'],
		description: 'Personal delivery destinations, sequence priorities, and contacts.',
		layout: 'field',
	},
	{
		key: '/logistics/status',
		label: 'Status Updates',
		section: 'LOGISTICS',
		roles: ['Admin', 'Delivery_Driver'],
		description: 'Push milestone transitions such as In Transit or Delivered.',
		layout: 'field',
	},
	{
		key: '/logistics/incidents',
		label: 'Incident Reporting',
		section: 'LOGISTICS',
		roles: ['Admin', 'Delivery_Driver'],
		description: 'Report delays, shipping blocks, or failed delivery attempts.',
		layout: 'field',
	},

	// ── Administration (Admin only) ───────────────────────────────────
	{
		key: '/admin/users',
		label: 'User Management',
		section: 'ADMINISTRATION',
		roles: ['Admin'],
		description: 'Account creation, access control, and identity verification.',
		layout: 'desktop',
	},
	{
		key: '/admin/audit-logs',
		label: 'Audit Logs',
		section: 'ADMINISTRATION',
		roles: ['Admin'],
		description: 'Operational history, user actions, and system health logs.',
		layout: 'desktop',
	},
	{
		key: '/admin/settings',
		label: 'System Settings',
		section: 'ADMINISTRATION',
		roles: ['Admin'],
		description: 'Core administration tools, credential resets, and notification rules.',
		layout: 'desktop',
	},
	{
		key: '/admin/corrections',
		label: 'Data Correction Hub',
		section: 'ADMINISTRATION',
		roles: ['Admin'],
		description: 'Override access to fix duplicate or erroneous entries across domains.',
		layout: 'desktop',
	},
]

export function getDefaultHomePath(role) {
	return ROLE_HOME[role] || '/auth/login'
}

export function getVisibleNavItems(role) {
	if (!role) return []
	if (role === 'Admin') return NAV_ITEMS
	return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function getNavItemByPath(pathname) {
	return NAV_ITEMS.find((item) => item.key === pathname)
}

export function getSelectedNavKey(pathname, visibleItems) {
	const match = visibleItems
		.filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
		.sort((a, b) => b.key.length - a.key.length)[0]
	return match?.key ?? pathname
}

export function canAccessRoute(role, path) {
	if (!role) return false
	const item = getNavItemByPath(path)
	if (!item) return false
	return role === 'Admin' || item.roles.includes(role)
}

/** Field workers get touch-friendly spacing; desk roles get dense grid layouts. */
export function getLayoutVariant(role) {
	if (role === 'Warehouse_Employee' || role === 'Delivery_Driver') return 'field'
	return 'desktop'
}

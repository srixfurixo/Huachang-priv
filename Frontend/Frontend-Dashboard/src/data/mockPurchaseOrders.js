/**
 * Mock purchase orders + PO/CA balance — stand-in until the backend
 * `/api/operations/purchase-orders` endpoint exists.
 *
 * Per the Legacy Data Audit (PO & CA BALANCE SHEET 2025.xlsx): we issue a PO to
 * a supplier, the supplier replies with an SO reference, then goods are released
 * in batches via supplier Collection Advice (CA) lots. So a PO is reconciled as
 * ordered (qty_mt) vs. collected (collected_mt) with a running po_balance_mt, and
 * carries a one-to-many list of supplier CA lots. A PO can be "Overdrawn" when
 * collected exceeds ordered — an exception the audit explicitly calls out.
 *
 * status is derived in the view from collected vs. ordered; a backend may also
 * send it directly.
 */
export const MOCK_PURCHASE_ORDERS = [
	{
		id: 1,
		po_number: '2507-032',
		po_date: '2026-06-02',
		supplier: 'AGROMATE',
		item: 'MOP',
		qty_mt: 500,
		collected_mt: 320,
		so_reference: 'SO-AG-8841',
		supplier_cas: [
			{ supplier_ca_ref: '0131606113', ca_date: '2026-06-08', ca_qty_mt: 180, ca_balance_mt: 0 },
			{ supplier_ca_ref: '0131606140', ca_date: '2026-06-15', ca_qty_mt: 140, ca_balance_mt: 0 },
		],
	},
	{
		id: 2,
		po_number: '2301-28',
		po_date: '2026-05-20',
		supplier: 'AGROMATE',
		item: 'AS',
		qty_mt: 200,
		collected_mt: 200,
		so_reference: 'SO-AG-8790',
		supplier_cas: [
			{ supplier_ca_ref: '0131605902', ca_date: '2026-05-28', ca_qty_mt: 120, ca_balance_mt: 0 },
			{ supplier_ca_ref: '0131605977', ca_date: '2026-06-04', ca_qty_mt: 80, ca_balance_mt: 0 },
		],
	},
	{
		id: 3,
		po_number: '2506-015',
		po_date: '2026-06-05',
		supplier: 'HAP SENG',
		item: 'MOP',
		qty_mt: 800,
		collected_mt: 300,
		so_reference: 'SO-HS-2290',
		supplier_cas: [
			{ supplier_ca_ref: '0142210088', ca_date: '2026-06-12', ca_qty_mt: 300, ca_balance_mt: 500 },
		],
	},
	{
		id: 4,
		po_number: '2505-101',
		po_date: '2026-05-18',
		supplier: 'HAP SENG',
		item: 'ERP',
		qty_mt: 600,
		collected_mt: 600,
		so_reference: 'SO-HS-2271',
		supplier_cas: [
			{ supplier_ca_ref: '0142209915', ca_date: '2026-05-26', ca_qty_mt: 300, ca_balance_mt: 0 },
			{ supplier_ca_ref: '0142210004', ca_date: '2026-06-02', ca_qty_mt: 300, ca_balance_mt: 0 },
		],
	},
	{
		id: 5,
		po_number: '2507-009',
		po_date: '2026-06-09',
		supplier: 'PRM',
		item: 'CIRP',
		qty_mt: 300,
		collected_mt: 0,
		so_reference: '',
		supplier_cas: [],
	},
	{
		id: 6,
		po_number: '2504-077',
		po_date: '2026-05-10',
		supplier: 'BERJAYA',
		item: 'AC',
		qty_mt: 150,
		collected_mt: 165,
		so_reference: 'SO-BJ-5520',
		// Overdrawn: collected exceeds ordered — flagged as an exception.
		supplier_cas: [
			{ supplier_ca_ref: '0150033421', ca_date: '2026-05-19', ca_qty_mt: 90, ca_balance_mt: 0 },
			{ supplier_ca_ref: '0150033510', ca_date: '2026-05-27', ca_qty_mt: 75, ca_balance_mt: 0 },
		],
	},
	{
		id: 7,
		po_number: '2506-061',
		po_date: '2026-06-11',
		supplier: 'PRM',
		item: 'CIRP',
		qty_mt: 250,
		collected_mt: 110,
		so_reference: 'SO-PR-1175',
		supplier_cas: [
			{ supplier_ca_ref: '0160774120', ca_date: '2026-06-17', ca_qty_mt: 110, ca_balance_mt: 140 },
		],
	},
]

export default MOCK_PURCHASE_ORDERS

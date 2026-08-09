/**
 * Mock intake / outtake log — a flattened view of inventory_movements from the
 * Legacy Data Audit. Stand-in until the backend `/api/operations/intake-log`
 * endpoint exists.
 *
 * movement_type mirrors the audit's event model:
 *   Intake             — material collected in against a Huachang CA
 *   Production Consumed — raw material drawn into a mixing job (MS)
 *   Production Output   — finished good produced (AutoCount assembly, ASM)
 *   Delivery Out        — finished/trading goods dispatched on a Delivery Order
 *
 * reference therefore points at a CA, MS/ASM, or DO identifier accordingly.
 * Entries are newest-first.
 */
export const MOCK_INTAKE_LOG = [
	{
		id: 1,
		timestamp: '2026-06-21 09:42',
		movement_type: 'Intake',
		item_code: 'MOP',
		quantity_mt: 180,
		reference: 'CA 25-0101',
		location: 'YAL 5',
		logged_by: 'Aung Min',
	},
	{
		id: 2,
		timestamp: '2026-06-21 08:15',
		movement_type: 'Delivery Out',
		item_code: 'HG-02',
		quantity_mt: 60,
		reference: 'DO-2501311',
		location: 'Jenjarom',
		logged_by: 'Su Hlaing',
	},
	{
		id: 3,
		timestamp: '2026-06-20 16:30',
		movement_type: 'Production Output',
		item_code: 'CBB-404',
		quantity_mt: 25,
		reference: 'ASM-004061',
		location: 'Jenjarom',
		logged_by: 'Kyaw Zin',
	},
	{
		id: 4,
		timestamp: '2026-06-20 14:05',
		movement_type: 'Production Consumed',
		item_code: 'MOP',
		quantity_mt: 11,
		reference: 'MS 4452',
		location: 'Jenjarom',
		logged_by: 'Kyaw Zin',
	},
	{
		id: 5,
		timestamp: '2026-06-20 11:20',
		movement_type: 'Intake',
		item_code: 'MOP',
		quantity_mt: 300,
		reference: 'CA 25-0152',
		location: 'YAL 3',
		logged_by: 'Aung Min',
	},
	{
		id: 6,
		timestamp: '2026-06-19 15:48',
		movement_type: 'Delivery Out',
		item_code: 'CBB-403',
		quantity_mt: 40,
		reference: 'DO-2501305',
		location: 'O&T',
		logged_by: 'Su Hlaing',
	},
	{
		id: 7,
		timestamp: '2026-06-19 10:12',
		movement_type: 'Production Consumed',
		item_code: 'ERP',
		quantity_mt: 8,
		reference: 'MS 4449',
		location: 'Jenjarom',
		logged_by: 'Kyaw Zin',
	},
	{
		id: 8,
		timestamp: '2026-06-18 13:37',
		movement_type: 'Intake',
		item_code: 'AC',
		quantity_mt: 90,
		reference: 'CA 25-0244',
		location: 'BERJAYA',
		logged_by: 'Aung Min',
	},
	{
		id: 9,
		timestamp: '2026-06-18 09:05',
		movement_type: 'Delivery Out',
		item_code: 'HG-13',
		quantity_mt: 75,
		reference: 'DO-2501301',
		location: 'Jenjarom',
		logged_by: 'Su Hlaing',
	},
	{
		id: 10,
		timestamp: '2026-06-17 14:22',
		movement_type: 'Production Output',
		item_code: 'CBB-403',
		quantity_mt: 25,
		reference: 'ASM-004058',
		location: 'Jenjarom',
		logged_by: 'Kyaw Zin',
	},
]

export default MOCK_INTAKE_LOG

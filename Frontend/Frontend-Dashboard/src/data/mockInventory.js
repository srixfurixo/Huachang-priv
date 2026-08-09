/**
 * Mock inventory — a per-item-per-location balance read-model, the way a
 * manager dashboard would aggregate it. Stand-in until the backend
 * `/api/operations/inventory` endpoint exists.
 *
 * Per the Legacy Data Audit: stock is NOT a single balance. Internal-warehouse
 * stock is live; external third-party warehouse stock is "reported" and can lag
 * 1–2 weeks, so each row carries source + last_verified rather than a reorder
 * threshold (which does not exist in the legacy data).
 */
export const MOCK_INVENTORY = [
	{
		id: 1,
		item_code: 'MOP',
		quantity_mt: 240,
		location: 'Jenjarom',
		source: 'Live',
		last_verified: '2026-06-21',
	},
	{
		id: 2,
		item_code: 'MOP',
		quantity_mt: 1280,
		location: 'YAL 5',
		source: 'Reported',
		last_verified: '2026-06-18',
	},
	{
		id: 3,
		item_code: 'MOP',
		quantity_mt: 860,
		location: 'YAL 3',
		source: 'Reported',
		last_verified: '2026-06-05',
	},
	{
		id: 4,
		item_code: 'ERP',
		quantity_mt: 540,
		location: 'YAL 3',
		source: 'Reported',
		last_verified: '2026-06-03',
	},
	{
		id: 5,
		item_code: 'CIRP',
		quantity_mt: 320,
		location: 'PRM',
		source: 'Reported',
		last_verified: '2026-06-19',
	},
	{
		id: 6,
		item_code: 'AC',
		quantity_mt: 90,
		location: 'BULK CHEM',
		source: 'Reported',
		last_verified: '2026-06-20',
	},
	{
		id: 7,
		item_code: 'AS',
		quantity_mt: 45,
		location: 'Jenjarom',
		source: 'Live',
		last_verified: '2026-06-22',
	},
	{
		id: 8,
		item_code: 'HG-02',
		quantity_mt: 410,
		location: 'Jenjarom',
		source: 'Live',
		last_verified: '2026-06-22',
	},
	{
		id: 9,
		item_code: 'CBB-403',
		quantity_mt: 175,
		location: 'O&T',
		source: 'Reported',
		last_verified: '2026-06-02',
	},
	{
		id: 10,
		item_code: 'CBB-404',
		quantity_mt: 60,
		location: 'Jenjarom',
		source: 'Live',
		last_verified: '2026-06-21',
	},
	{
		id: 11,
		item_code: 'HG-13',
		quantity_mt: 0,
		location: 'Jenjarom',
		source: 'Live',
		last_verified: '2026-06-20',
	},
]

export default MOCK_INVENTORY

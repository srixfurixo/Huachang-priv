/**
 * Canonical master data drawn from Group 9's Legacy Data Audit (P2).
 * Single source of truth for the dummy data across all Manager views so that
 * cross-references (PO ↔ CA ↔ Intake ↔ Production) stay internally consistent.
 *
 * When the backend/ERD lands these become reference tables (suppliers,
 * items, locations, customers); the view code should not need to change.
 */

export const SUPPLIERS = ['HAP SENG', 'AGROMATE', 'PRM', 'BERJAYA']

/**
 * item_type captures the audit's note that a fertilizer item can be a raw
 * material, a finished good, or a trading (buy-and-sell) item depending on
 * context — not a strict binary.
 */
export const ITEMS = [
	{ code: 'MOP', description: 'Muriate of Potash 60% K2O', item_type: 'Raw Material' },
	{ code: 'ERP', description: 'Egypt Rock Phosphate 27% P2O5', item_type: 'Raw Material' },
	{ code: 'CIRP', description: 'CIRP (Trading Grade)', item_type: 'Trading' },
	{ code: 'AC', description: 'Ammonium Chloride 25% N', item_type: 'Raw Material' },
	{ code: 'AS', description: 'Ammonium Sulphate 21% N', item_type: 'Raw Material' },
	{ code: 'HG-02', description: 'GOLDMAS 12-12-18-2+TE (50KG)', item_type: 'Finished Good' },
	{ code: 'HG-13', description: 'GOLDMAS 13-8-21-3+TE (50KG)', item_type: 'Finished Good' },
	{ code: 'CBB-403', description: 'COMPOUND BB 10-10-30+B+TE (50KG)', item_type: 'Finished Good' },
	{ code: 'CBB-404', description: 'COMPOUND BB 13-13-21+B+TE (50KG)', item_type: 'Finished Good' },
]

/**
 * Internal warehouses hold live stock; external warehouses are third-party and
 * the audit warns their stock figures can lag by 1–2 weeks (reported, not live).
 */
export const LOCATIONS = [
	{ name: 'Jenjarom', type: 'Internal' },
	{ name: 'YAL 3', type: 'External' },
	{ name: 'YAL 5', type: 'External' },
	{ name: 'PRM', type: 'External' },
	{ name: 'BERJAYA', type: 'External' },
	{ name: 'BULK CHEM', type: 'External' },
	{ name: 'O&T', type: 'External' },
	{ name: 'NSBK', type: 'External' },
]

export const CUSTOMERS = [
	'HOCK CHONG TRADING (TRIANG) SDN BHD',
	'TRONG TRADING SDN BHD',
	'RONG HE ENTERPRISE (M) SDN BHD',
	'O & T SOLUTION SDN BHD',
	'FC RESOURCES SOLUTION SDN BHD',
]

/** Quick lookup: item code → description. */
export const ITEM_DESCRIPTION = Object.fromEntries(
	ITEMS.map((i) => [i.code, i.description]),
)

/** Quick lookup: location name → Internal | External. */
export const LOCATION_TYPE = Object.fromEntries(
	LOCATIONS.map((l) => [l.name, l.type]),
)

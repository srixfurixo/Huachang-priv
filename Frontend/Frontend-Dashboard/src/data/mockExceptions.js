/**
 * Mock data-exception register — seeded with the ACTUAL reconciliation findings
 * from Group 9's Legacy Data Audit (P2), §7 and §10. Stand-in until the backend
 * `/api/operations/exceptions` endpoint exists.
 *
 * These are migration risks the audit says to "flag, not auto-fix": CA quantity
 * mismatches that survive aggregation, supplier/item cross-placements, unmatched
 * 2025 CAs, location spelling variants, and delayed external stock.
 */
export const MOCK_EXCEPTIONS = [
	// ── §7.3 Aggregated CA quantity discrepancies (7) ──────────────────
	{
		id: 1,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0172',
		detail: 'CA Listing 20.0 MT vs PO/CA aggregated 20.6 MT (PRM / IN STORE / CIRP).',
		severity: 'Low',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},
	{
		id: 2,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0176',
		detail: 'CA Listing 29.4 MT vs PO/CA aggregated 14.4 MT (PRM / SIN LOONG / CIRP).',
		severity: 'High',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},
	{
		id: 3,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0203',
		detail: 'CA Listing 40.0 MT vs PO/CA aggregated 70.0 MT across 2 rows (PRM / NSBK / CIRP).',
		severity: 'High',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Under Review',
	},
	{
		id: 4,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0264',
		detail: 'CA Listing 40.0 MT vs PO/CA aggregated 30.0 MT (AGROMATE / O & T / MOP).',
		severity: 'Medium',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},
	{
		id: 5,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0265',
		detail: 'CA Listing 30.0 MT vs PO/CA aggregated 40.0 MT (PRM / NSBK / CIRP).',
		severity: 'Medium',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},
	{
		id: 6,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0284',
		detail: 'CA Listing 40.0 MT vs PO/CA aggregated 30.0 MT (AGROMATE / AGRICODE / MOP).',
		severity: 'Medium',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},
	{
		id: 7,
		type: 'CA Quantity Mismatch',
		reference: 'CA 25-0286',
		detail: 'CA Listing 15.0 MT vs PO/CA aggregated 30.0 MT across 2 rows (AGROMATE / IN STORE / ERP).',
		severity: 'High',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},

	// ── §7.4 Supplier/item cross-placement (3) ─────────────────────────
	{
		id: 8,
		type: 'Supplier/Item Cross-Placement',
		reference: 'CA 25-0265',
		detail: 'Listed under PRM/CIRP but appears in AGROMATE sheet as MOP. Possible cross-posting.',
		severity: 'High',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Under Review',
	},
	{
		id: 9,
		type: 'Supplier/Item Cross-Placement',
		reference: 'CA 25-0203',
		detail: 'Listed under PRM/CIRP but appears in HAP SENG sheet as ERP. Possible substitution.',
		severity: 'High',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Under Review',
	},
	{
		id: 10,
		type: 'Supplier/Item Cross-Placement',
		reference: 'CA 25-0264',
		detail: 'Listed under AGROMATE/MOP but appears in PRM sheet as CIRP. Verify before migration.',
		severity: 'High',
		sources: 'CA LISTING 25 ↔ PO & CA BALANCE 2025',
		status: 'Open',
	},

	// ── §7.2 Unmatched 2025 CAs (5) ────────────────────────────────────
	{
		id: 11,
		type: 'Unmatched CA',
		reference: 'CA 25-0105, 0106, 0171, 0202, 0227',
		detail: 'Five 2025 CA Listing numbers not found among PO/CA balance child references.',
		severity: 'Medium',
		sources: 'CA LISTING 25',
		status: 'Open',
	},

	// ── §7.5 Location naming variants ──────────────────────────────────
	{
		id: 12,
		type: 'Location Variant',
		reference: 'YAL 3 / YAL3 / YA L3',
		detail: 'Same location entered three ways; needs canonical mapping before stock import.',
		severity: 'Low',
		sources: 'CA LISTING 25',
		status: 'Open',
	},

	// ── §6.2 Delayed external stock ────────────────────────────────────
	{
		id: 13,
		type: 'Delayed External Stock',
		reference: 'YAL 3 / O&T',
		detail: 'External warehouse balances last verified > 14 days ago; treat as reported, not live.',
		severity: 'Medium',
		sources: 'Inventory (reported)',
		status: 'Open',
	},
]

export default MOCK_EXCEPTIONS

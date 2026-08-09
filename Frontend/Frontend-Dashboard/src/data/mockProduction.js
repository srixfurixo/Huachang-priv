/**
 * Mock production tasks + stock assemblies — modelled on DAILY PRODUCTION
 * TASKS.xlsx (manual mixing sheets, "MS ####") reconciled to the official
 * AutoCount stock assembly records ("ASM-####") from the Legacy Data Audit.
 * Stand-in until the backend `/api/operations/production` endpoint exists.
 *
 * Each manual mixing sheet (ms_number) maps to an AutoCount assembly
 * (assembly_ref) that outputs a finished item. The audit notes the produced
 * code carries a date/batch prefix (e.g. 260102CBB-404) over the product master
 * code (CBB-404) — both are kept. MS 4476 reconciles to TWO assemblies, so it
 * appears as two rows.
 */
export const MOCK_PRODUCTION = [
	{
		id: 1,
		ms_number: 'MS 4442',
		production_date: '2026-01-02',
		product: 'COMPOUND BB 13-13-21+B+TE',
		master_code: 'CBB-404',
		finished_code: '260102CBB-404',
		assembly_ref: 'ASM-004048',
		bag_type: 'SUPER P BAG',
		planned_qty_mt: 25,
		output_mt: 25,
		wastage_mt: 0.2,
		status: 'Completed',
	},
	{
		id: 2,
		ms_number: 'MS 4447',
		production_date: '2026-01-05',
		product: 'GOLDMAS 12-12-18-2+TE',
		master_code: 'HG-02',
		finished_code: '260105HG-02',
		assembly_ref: 'ASM-004053',
		bag_type: 'GOLDMAS BAG',
		planned_qty_mt: 30,
		output_mt: 29.6,
		wastage_mt: 0.4,
		status: 'Completed',
	},
	{
		id: 3,
		ms_number: 'MS 4449',
		production_date: '2026-01-08',
		product: 'COMPOUND BB 10-10-30+B+TE',
		master_code: 'CBB-403',
		finished_code: '260108CBB-403',
		assembly_ref: 'ASM-004058',
		bag_type: 'SUPER P BAG',
		planned_qty_mt: 25,
		output_mt: 25,
		wastage_mt: 0.15,
		status: 'Completed',
	},
	{
		id: 4,
		ms_number: 'MS 4452',
		production_date: '2026-01-12',
		product: 'COMPOUND BB 13-13-21+B+TE',
		master_code: 'CBB-404',
		finished_code: '260112CBB-404',
		assembly_ref: 'ASM-004061',
		bag_type: 'SUPER P BAG',
		planned_qty_mt: 25,
		output_mt: 25,
		wastage_mt: 0.3,
		status: 'Completed',
	},
	{
		id: 5,
		ms_number: 'MS 4474',
		production_date: '2026-01-20',
		product: 'GOLDMAS 13-8-21-3+TE',
		master_code: 'HG-13',
		finished_code: '260120HG-13',
		assembly_ref: 'ASM-004088',
		bag_type: 'GOLDMAS BAG',
		planned_qty_mt: 40,
		output_mt: 0,
		wastage_mt: 0,
		status: 'In Progress',
	},
	{
		id: 6,
		ms_number: 'MS 4476',
		production_date: '2026-01-22',
		product: 'COMPOUND BB 10-10-30+B+TE',
		master_code: 'CBB-403',
		finished_code: '260122CBB-403',
		assembly_ref: 'ASM-004090',
		bag_type: 'SUPER P BAG',
		planned_qty_mt: 25,
		output_mt: 25,
		wastage_mt: 0.2,
		status: 'Completed',
	},
	{
		id: 7,
		// Same manual mixing sheet (MS 4476) reconciled to a second AutoCount
		// assembly — one sheet can yield multiple assembly outputs (audit §3.4).
		ms_number: 'MS 4476',
		production_date: '2026-01-22',
		product: 'COMPOUND BB 10-10-30+B+TE',
		master_code: 'CBB-403',
		finished_code: '260122CBB-403-2',
		assembly_ref: 'ASM-004091',
		bag_type: 'SUPER P BAG',
		planned_qty_mt: 15,
		output_mt: 15,
		wastage_mt: 0.1,
		status: 'Completed',
	},
	{
		id: 8,
		ms_number: 'MS 4480',
		production_date: '2026-01-26',
		product: 'GOLDMAS 12-12-18-2+TE',
		master_code: 'HG-02',
		finished_code: '',
		assembly_ref: '',
		bag_type: 'GOLDMAS BAG',
		planned_qty_mt: 30,
		output_mt: 0,
		wastage_mt: 0,
		status: 'Planned',
	},
]

export default MOCK_PRODUCTION

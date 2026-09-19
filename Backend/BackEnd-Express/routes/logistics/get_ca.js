const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

router.get('/get_ca', async (req, res) => {
    const query = `
        SELECT 
            hca.hg_ca_number,
            hca.ca_date,
            hcal.item_code,
            hcal.quantity_mt,
            hca.transporter_name,
            hca.driver_name,
            hca.lorry_number,
            hca.status,
            pol.po_number,
            sca.supplier_ca_ref,
            l.name AS pickup_location_name,
            hca.destination_type,
            hca.destination_id
        FROM huachang_collection_advices hca
        LEFT JOIN huachang_collection_advice_lines hcal ON hca.hg_ca_number = hcal.hg_ca_number
        LEFT JOIN supplier_collection_advices sca ON hcal.supplier_ca_id = sca.id
        LEFT JOIN purchase_order_lines pol ON sca.po_line_id = pol.id
        INNER JOIN locations l ON hca.pickup_location_id = l.id
        ORDER BY hca.ca_date DESC;
    `;

    try {
        const { rows } = await pool.query(query);
        return res.status(200).json({
            success: true,
            trucking_registry: rows
        });
    } catch (error) {
        console.error('Failed to retrieve Huachang collection advices:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while retrieving Huachang collection advices.'
        });
    }
});

module.exports = router;

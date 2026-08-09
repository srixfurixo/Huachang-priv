const express = require('express');
const router = express.Router();
const pool = require('../../Static/db_main');

const SEVERITY_RANK = { Critical: 1, High: 2, Medium: 3 };

function tagRows(rows, type, severity) {
    const tagged = [];
    for (const row of rows) {
        tagged.push({ type, severity, ...row });
    }
    return tagged;
}

async function getOutOfStock() {
    const { rows } = await pool.query(`
        SELECT i.item_code, NULL::int AS location_id, NULL::text AS location,
            'Item ' || i.item_code || ' (' || i.description || ') is completely out of stock but has open sales orders.' AS detail,
            'Expedite incoming supply or reallocate the sales order.' AS action,
            '/inventory/items/' || i.item_code AS link_hint
        FROM items i
        LEFT JOIN (
            SELECT item_code, SUM(current_qty) AS qty FROM inventory_batches WHERE status_confidence = 'Live' GROUP BY item_code
        ) ls ON ls.item_code = i.item_code
        WHERE COALESCE(ls.qty, 0) = 0
          AND EXISTS (SELECT 1 FROM sales_orders so WHERE so.item_code = i.item_code AND so.status NOT IN ('Cancelled', 'Fulfilled'))
    `);
    return tagRows(rows, 'OUT_OF_STOCK', 'Critical');
}

async function getOversold() {
    const { rows } = await pool.query(`
        SELECT i.item_code, NULL::int AS location_id, NULL::text AS location,
            'Item ' || i.item_code || ' has ' || COALESCE(cs.qty, 0) || ' MT committed but only ' || (COALESCE(ls.qty, 0) + COALESCE(ins.qty, 0)) || ' MT on hand and inbound.' AS detail,
            'Review confirmed allocations and expedite incoming supply.' AS action,
            '/inventory/availability?item_code=' || i.item_code AS link_hint
        FROM items i
        LEFT JOIN (SELECT item_code, SUM(current_qty) AS qty FROM inventory_batches WHERE status_confidence = 'Live' GROUP BY item_code) ls ON ls.item_code = i.item_code
        LEFT JOIN (SELECT item_code, SUM(quantity_mt) AS qty FROM huachang_collection_advices WHERE status NOT IN ('Completed', 'Cancelled') GROUP BY item_code) ins ON ins.item_code = i.item_code
        LEFT JOIN (SELECT item_code, SUM(allocated_qty_mt) AS qty FROM sales_order_allocations WHERE status = 'Confirmed' GROUP BY item_code) cs ON cs.item_code = i.item_code
        WHERE COALESCE(cs.qty, 0) > (COALESCE(ls.qty, 0) + COALESCE(ins.qty, 0))
    `);
    return tagRows(rows, 'OVERSOLD', 'Critical');
}

async function getExpired() {
    const { rows } = await pool.query(`
        SELECT b.item_code, l.id AS location_id, l.name AS location,
            'Batch ' || b.batch_code || ' of ' || b.item_code || ' expired on ' || b.expiry_date || ' with ' || b.current_qty || ' MT still in stock.' AS detail,
            'Remove or write off the expired stock via a stock adjustment.' AS action,
            '/inventory/batches/' || b.batch_code AS link_hint
        FROM inventory_batches b
        JOIN locations l ON l.id = b.location_id
        WHERE b.expiry_date < CURRENT_DATE AND b.current_qty > 0
    `);
    return tagRows(rows, 'EXPIRED', 'Critical');
}

async function getLowStock() {
    const { rows } = await pool.query(`
        SELECT i.item_code, NULL::int AS location_id, NULL::text AS location,
            'Available-to-promise for ' || i.item_code || ' (' || (COALESCE(ls.qty, 0) + COALESCE(ins.qty, 0) - COALESCE(cs.qty, 0)) || ' MT) is below the threshold of ' || i.threshold_level || ' MT.' AS detail,
            'Plan replenishment for this item.' AS action,
            '/inventory/availability?item_code=' || i.item_code AS link_hint
        FROM items i
        LEFT JOIN (SELECT item_code, SUM(current_qty) AS qty FROM inventory_batches WHERE status_confidence = 'Live' GROUP BY item_code) ls ON ls.item_code = i.item_code
        LEFT JOIN (SELECT item_code, SUM(quantity_mt) AS qty FROM huachang_collection_advices WHERE status NOT IN ('Completed', 'Cancelled') GROUP BY item_code) ins ON ins.item_code = i.item_code
        LEFT JOIN (SELECT item_code, SUM(allocated_qty_mt) AS qty FROM sales_order_allocations WHERE status = 'Confirmed' GROUP BY item_code) cs ON cs.item_code = i.item_code
        WHERE i.threshold_level > 0
          AND (COALESCE(ls.qty, 0) + COALESCE(ins.qty, 0) - COALESCE(cs.qty, 0)) < i.threshold_level
    `);
    return tagRows(rows, 'LOW_STOCK', 'High');
}

async function getExpiring(daysFrom, daysTo, type, severity) {
    // daysFrom = 0 means "from today", so the lower bound has to be inclusive (>=) instead of strictly after
    let params;
    let lowerBound;
    let upperParamIndex;

    if (daysFrom === 0) {
        params = [daysTo];
        lowerBound = `b.expiry_date >= CURRENT_DATE`;
        upperParamIndex = 1;
    } else {
        params = [daysFrom, daysTo];
        lowerBound = `b.expiry_date > CURRENT_DATE + $1 * INTERVAL '1 day'`;
        upperParamIndex = 2;
    }

    const { rows } = await pool.query(`
        SELECT b.item_code, l.id AS location_id, l.name AS location,
            'Batch ' || b.batch_code || ' expires on ' || b.expiry_date || ', ' || b.current_qty || ' MT remaining.' AS detail,
            'Prioritise this batch for dispatch (FIFO).' AS action,
            '/inventory/batches/' || b.batch_code AS link_hint
        FROM inventory_batches b
        JOIN locations l ON l.id = b.location_id
        WHERE ${lowerBound}
          AND b.expiry_date <= CURRENT_DATE + $${upperParamIndex} * INTERVAL '1 day'
          AND b.current_qty > 0
    `, params);
    return tagRows(rows, type, severity);
}

async function getIntakeVariance() {
    const { rows } = await pool.query(`
        SELECT b.item_code, l.id AS location_id, l.name AS location,
            'Batch ' || b.batch_code || ' intake had a quantity variance: ' || im.remarks AS detail,
            'Verify the received weight against the purchase paperwork.' AS action,
            '/inventory/batches/' || b.batch_code AS link_hint
        FROM inventory_batches b
        JOIN locations l ON l.id = b.location_id
        JOIN inventory_movements im ON im.batch_code = b.batch_code AND im.movement_type = 'INTAKE' AND im.remarks ILIKE '%VARIANCE:%'
        WHERE b.current_qty > 0
    `);
    return tagRows(rows, 'INTAKE_VARIANCE', 'High');
}

async function getStaleReport() {
    const { rows } = await pool.query(`
        SELECT b.item_code, l.id AS location_id, l.name AS location,
            'Batch ' || b.batch_code || ' at external location ' || l.name || ' has not been reverified in over 14 days.' AS detail,
            'Request an updated stock report from the external site.' AS action,
            '/inventory/batches/' || b.batch_code AS link_hint
        FROM inventory_batches b
        JOIN locations l ON l.id = b.location_id
        WHERE l.location_type != 'Internal'
          AND b.status_confidence = 'Reported'
          AND (b.last_verified_at IS NULL OR b.last_verified_at < NOW() - INTERVAL '14 days')
          AND b.current_qty > 0
    `);
    return tagRows(rows, 'STALE_REPORT', 'Medium');
}

async function getPendingVerification() {
    const { rows } = await pool.query(`
        SELECT b.item_code, l.id AS location_id, l.name AS location,
            'Batch ' || b.batch_code || ' has been awaiting verification for over 24 hours.' AS detail,
            'Have a supervisor verify or reject this intake.' AS action,
            '/inventory/intake/pending' AS link_hint
        FROM inventory_batches b
        JOIN locations l ON l.id = b.location_id
        WHERE b.status_confidence = 'Pending' AND b.created_at < NOW() - INTERVAL '24 hours'
    `);
    return tagRows(rows, 'PENDING_VERIFICATION', 'Medium');
}

async function getCaNotReceived() {
    const { rows } = await pool.query(`
        SELECT hca.item_code, l.id AS location_id, l.name AS location,
            'Truck CA ' || hca.hg_ca_number || ' was dispatched on ' || hca.ca_date || ' and has still not been received.' AS detail,
            'Follow up with the transporter or driver.' AS action,
            '/logistics/get_ca' AS link_hint
        FROM huachang_collection_advices hca
        JOIN locations l ON l.id = hca.pickup_location_id
        WHERE hca.status NOT IN ('Completed', 'Cancelled') AND hca.ca_date < CURRENT_DATE - INTERVAL '7 days'
    `);
    return tagRows(rows, 'CA_NOT_RECEIVED', 'Medium');
}

async function getPoOverdue() {
    const { rows } = await pool.query(`
        SELECT po.item_code, NULL::int AS location_id, NULL::text AS location,
            'Purchase order ' || po.po_number || ' placed on ' || po.po_date || ' still has ' || (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) || ' MT uncollected.' AS detail,
            'Chase the supplier for collection.' AS action,
            '/orders/purchase' AS link_hint
        FROM purchase_orders po
        LEFT JOIN supplier_collection_advices sca ON sca.po_number = po.po_number
        WHERE po.po_date < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY po.po_number, po.item_code, po.po_date, po.ordered_qty_mt
        HAVING (po.ordered_qty_mt - COALESCE(SUM(sca.available_qty_mt), 0)) > 0
    `);
    return tagRows(rows, 'PO_OVERDUE', 'Medium');
}

async function getAllAlerts() {
    const results = await Promise.all([
        getOutOfStock(),
        getOversold(),
        getExpired(),
        getLowStock(),
        getExpiring(0, 30, 'EXPIRING_30', 'High'),
        getIntakeVariance(),
        getExpiring(30, 60, 'EXPIRING_60', 'Medium'),
        getStaleReport(),
        getPendingVerification(),
        getCaNotReceived(),
        getPoOverdue()
    ]);

    const alerts = [];
    for (const result of results) {
        for (const alert of result) {
            alerts.push(alert);
        }
    }

    alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    return alerts;
}

router.get('/alerts', async (req, res) => {
    const { severity, location_id, type } = req.query;

    try {
        let alerts = await getAllAlerts();

        if (severity) {
            const filtered = [];
            for (const alert of alerts) {
                if (alert.severity === severity) {
                    filtered.push(alert);
                }
            }
            alerts = filtered;
        }

        if (location_id) {
            const filtered = [];
            for (const alert of alerts) {
                if (String(alert.location_id) === String(location_id)) {
                    filtered.push(alert);
                }
            }
            alerts = filtered;
        }

        if (type) {
            const filtered = [];
            for (const alert of alerts) {
                if (alert.type === type) {
                    filtered.push(alert);
                }
            }
            alerts = filtered;
        }

        alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

        res.json({ success: true, alerts });
    } catch (err) {
        console.error('Alerts feed error:', err.stack);
        res.status(500).json({ success: false, error: 'Failed to load alerts' });
    }
});

module.exports = router;
module.exports.getAllAlerts = getAllAlerts;

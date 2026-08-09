async function applyMovement(client, options) {
    const {
        batch_code,
        location_id,
        movement_type,
        quantity_change,
        reference_doc,
        remarks,
        performed_by
    } = options;

    const batchResult = await client.query(
        'SELECT current_qty FROM inventory_batches WHERE batch_code = $1 FOR UPDATE',
        [batch_code]
    );

    if (batchResult.rows.length === 0) {
        const error = new Error(`Batch '${batch_code}' not found.`);
        error.statusCode = 404;
        throw error;
    }

    const currentQty = Number(batchResult.rows[0].current_qty);
    const change = Number(quantity_change);
    const newQty = currentQty + change;

    if (change < 0 && newQty < 0) {
        const error = new Error(`Insufficient stock on batch '${batch_code}': available ${currentQty} MT, requested ${Math.abs(change)} MT, short by ${Math.abs(newQty)} MT.`);
        error.statusCode = 400;
        throw error;
    }

    await client.query(
        'UPDATE inventory_batches SET current_qty = $1, last_verified_at = CURRENT_TIMESTAMP WHERE batch_code = $2',
        [newQty, batch_code]
    );

    await client.query(
        `INSERT INTO inventory_movements (
            batch_code, location_id, movement_type, quantity_change, reference_doc, remarks, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [batch_code, location_id, movement_type, change, reference_doc || null, remarks || null, performed_by]
    );

    return newQty;
}

module.exports = { applyMovement };

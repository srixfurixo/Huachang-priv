const ITEM_TYPE_SQL = `
    CASE
        WHEN i.can_be_produced THEN 'Finished Good'
        WHEN i.can_be_consumed AND NOT i.can_be_sold THEN 'Raw Material'
        ELSE 'Trading Item'
    END
`;

module.exports = { ITEM_TYPE_SQL };

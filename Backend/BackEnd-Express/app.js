const express = require('express');
const app = express();
const pool = require('./Static/db_main');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://103.209.158.213',
    process.env.CLIENT_ORIGIN 
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/api/db_test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, time: result.rows[0].now });
    } catch (err) {
        console.error('Database query error:', err.stack);
        res.status(500).json({ success: false, error: 'Database query failed' });
    }   
});

const authRoutes = require('./Auth/login'); 
const forgotResetPasswordRoutes = require('./Auth/forgot-reset-password');
const registerRoutes = require('./Auth/register');
const retrieveUsersRoutes = require('./Admin/retrieve_users');
const logoutRoutes = require('./Auth/logout');
const intakeRoutes = require('./routes/inventory/intake');
const inventoryReportingRoutes = require('./Inventory/reporting');
const supplierCaRoutes = require('./routes/logistics/supplier-ca');
const huachangCaRoutes = require('./routes/logistics/huachang-ca');
const getCaRoutes = require('./routes/logistics/get_ca');
const purchaseRoutes = require('./routes/orders/purchase');
const getPurchaseRoutes = require('./routes/orders/get-purchase');
const salesRoutes = require('./routes/orders/sales');
const getSalesRoutes = require('./routes/orders/get-sales');

const itemsRoutes = require('./ReferenceData/items');
const locationsRoutes = require('./ReferenceData/locations');
const suppliersRoutes = require('./ReferenceData/suppliers');
const customersRoutes = require('./ReferenceData/customers');
const itemSettingsRoutes = require('./ReferenceData/item-settings');
const editUserRoutes = require('./routes/admin/editUser');

const intakeVerificationRoutes = require('./routes/inventory/intake-verification');
const dispatchRoutes = require('./routes/inventory/dispatch');
const transferRoutes = require('./routes/inventory/transfer');
const adjustmentRoutes = require('./routes/inventory/adjustment');
const returnsRoutes = require('./routes/inventory/returns');
const batchesRoutes = require('./routes/inventory/batches');
const itemDetailRoutes = require('./routes/inventory/item-detail');
const agingRoutes = require('./routes/inventory/aging');
const availabilityRoutes = require('./routes/inventory/availability');
const alertsRoutes = require('./routes/inventory/alerts');
const stocktakeRoutes = require('./routes/inventory/stocktake');
const dashboardRoutes = require('./routes/inventory/dashboard');
const allocationsRoutes = require('./routes/orders/allocations');
const deliveryOrdersRoutes = require('./routes/logistics/delivery-orders');



const authenticate = require('./middleware/authenticate');
const authorize = require('./middleware/authorize');

// Public: 
app.use('/api/auth', authRoutes);
app.use('/api/auth', forgotResetPasswordRoutes);
app.use('/api/auth', logoutRoutes);

// Admin only
// check can never end up guarding /login by accident
app.use('/api/auth/register', authenticate, authorize('Admin'), registerRoutes);

// Admin only: managing user accounts and roles
app.use('/api/admin', authenticate, authorize('Admin'), retrieveUsersRoutes);
app.use('/api/admin', authenticate, authorize('Admin'), editUserRoutes);

// All Staff for now: Document middleware and routes.
const document_retrieverRoutes = require('./Helpers/document_retriever');
const uploderRoutes = require('./Helpers/uploder');
app.use('/api/documents', authenticate,authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), document_retrieverRoutes);
app.use('/api/documents', authenticate,authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), uploderRoutes);

// Admin, Manager, Warehouse_Supervisor, Warehouse_Employee: day-to-day warehouse/stock viewing and intake
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), intakeRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), inventoryReportingRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), batchesRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), itemDetailRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), agingRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Warehouse_Employee'), alertsRoutes);

// Admin, Manager, Warehouse_Supervisor: reviewing intake, moving stock between warehouses, and running
// physical stocktakes. Warehouse_Employee is excluded so staff cannot verify their own intake.
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor'), intakeVerificationRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor'), transferRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor'), returnsRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor'), availabilityRoutes);
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor'), stocktakeRoutes);
app.use('/api', authenticate, dashboardRoutes);
app.use('/api/inventory', authenticate, dashboardRoutes);

// Admin, Manager, Warehouse_Supervisor, Delivery_Supervisor: dispatching stock against a delivery order
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Delivery_Supervisor'), dispatchRoutes);

// Admin, Manager only: this is the one sanctioned way to correct a stock mistake
app.use('/api/inventory', authenticate, authorize('Admin', 'Manager'), adjustmentRoutes);

// Admin, Manager, Warehouse_Supervisor, Delivery_Supervisor, Delivery_Driver: delivery/logistics operations
app.use('/api/logistics', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Delivery_Supervisor', 'Delivery_Driver'), supplierCaRoutes);
app.use('/api/logistics', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Delivery_Supervisor', 'Delivery_Driver'), huachangCaRoutes);
app.use('/api/logistics', authenticate, authorize('Admin', 'Manager', 'Warehouse_Supervisor', 'Delivery_Supervisor', 'Delivery_Driver'), getCaRoutes);

// Admin, Manager, Delivery_Supervisor, Warehouse_Supervisor: creating and tracking delivery orders
app.use('/api/logistics', authenticate, authorize('Admin', 'Manager', 'Delivery_Supervisor', 'Warehouse_Supervisor'), deliveryOrdersRoutes);

// Admin, Manager: purchase and sales order management
app.use('/api/orders', authenticate, authorize('Admin', 'Manager'), purchaseRoutes);
app.use('/api/orders', authenticate, authorize('Admin', 'Manager'), getPurchaseRoutes);
app.use('/api/orders', authenticate, authorize('Admin', 'Manager'), salesRoutes);
app.use('/api/orders', authenticate, authorize('Admin', 'Manager'), getSalesRoutes);
app.use('/api/orders', authenticate, authorize('Admin', 'Manager'), allocationsRoutes);

// Any logged-in role: read-only reference data (items, locations, suppliers, customers)
app.use('/api/referenceData', authenticate, itemsRoutes)
app.use('/api/referenceData', authenticate, locationsRoutes)
app.use('/api/referenceData', authenticate, suppliersRoutes)
app.use('/api/referenceData', authenticate, customersRoutes)

// Admin, Manager: changing an item's reorder threshold or bag weight is a planning decision, not a plain read
app.use('/api/referenceData', authenticate, authorize('Admin', 'Manager'), itemSettingsRoutes)


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

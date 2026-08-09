BEGIN;

TRUNCATE TABLE user_roles, role_permissions, roles CASCADE;

ALTER TABLE roles ALTER COLUMN id RESTART WITH 1;

INSERT INTO roles (role_name, description) VALUES
('Admin', 'Handles user access control, global system settings, and audit logs.'),
('Manager', 'Handles inventory monitoring, production tasks, and sales orders.'),
('Warehouse_Supervisor', 'Assigns warehouse tasks to employees and monitors floor progress.'),
('Warehouse_Employee', 'Executes raw material intake entry and updates production task status.'),
('Delivery_Supervisor', 'Manages driver fleet assignments and monitors delivery status.'),
('Delivery_Driver', 'Updates delivery status routes and reports transit issues or delays.');

COMMIT;
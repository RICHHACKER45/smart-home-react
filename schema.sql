-- ========================================================
-- Smart Home System - Production Database Schema (SQL)
-- Optimized for Supabase (PostgreSQL) & IoT Realtime
-- ========================================================

-- Drop tables if resetting (in proper reverse foreign key order)
DROP TABLE IF EXISTS emergency_alerts CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS daily_climate_summaries CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- 1. ACCOUNTS & SECURITY
CREATE TABLE accounts (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    door_passkey_hash VARCHAR(255) NOT NULL, -- 4-digit PIN (Default: '1234')
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'resident', 'guest')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    fcm_push_token TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. HARDWARE DEVICES REGISTRY
CREATE TABLE devices (
    id VARCHAR(36) PRIMARY KEY,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(30) NOT NULL CHECK (device_type IN ('door_lock', 'climate_sensor', 'smoke_detector', 'combo_hub')),
    room_location VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    signal_strength INT DEFAULT 100 CHECK (signal_strength BETWEEN 0 AND 100),
    battery_level INT NULL CHECK (battery_level BETWEEN 0 AND 100),
    last_seen_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ENVIRONMENTAL SENSOR TELEMETRY
CREATE TABLE sensor_readings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id VARCHAR(36) NOT NULL,
    temperature DECIMAL(4, 1) NOT NULL,
    humidity DECIMAL(4, 1) NULL,
    smoke_detected BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sensor_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT
);
CREATE INDEX idx_sensor_readings_device_time ON sensor_readings(device_id, recorded_at DESC);

-- 4. DAILY CLIMATE AGGREGATED SUMMARIES
CREATE TABLE daily_climate_summaries (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id VARCHAR(36) NOT NULL,
    record_date DATE NOT NULL,
    max_temperature DECIMAL(4, 1) NOT NULL,
    min_temperature DECIMAL(4, 1) NOT NULL,
    avg_temperature DECIMAL(4, 1) NOT NULL,
    avg_humidity DECIMAL(4, 1) NULL,
    CONSTRAINT fk_summary_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT,
    CONSTRAINT uq_device_date UNIQUE (device_id, record_date)
);

-- 5. ACTIVITY & AUDIT LOGS
CREATE TABLE activity_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    account_id VARCHAR(36) NULL,
    actor_name VARCHAR(100) NULL,
    device_id VARCHAR(36) NULL,
    event_category VARCHAR(20) NOT NULL CHECK (event_category IN ('AUTH', 'DOOR', 'CLIMATE', 'EMERGENCY', 'SYSTEM')),
    action_description VARCHAR(255) NOT NULL,
    status_result VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status_result IN ('SUCCESS', 'FAILED', 'TRIGGERED', 'DISMISSED')),
    ip_origin VARCHAR(45) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    CONSTRAINT fk_log_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- 6. EMERGENCY HAZARD INCIDENTS
CREATE TABLE emergency_alerts (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    device_id VARCHAR(36) NOT NULL,
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('SMOKE_DETECTED', 'CRITICAL_HEAT', 'MANUAL_PANIC')),
    peak_value VARCHAR(50) NULL,
    auto_unlock_executed BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'TRIGGERED' CHECK (status IN ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED')),
    resolved_by_account_id VARCHAR(36) NULL,
    triggered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_alert_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT,
    CONSTRAINT fk_alert_resolved_by FOREIGN KEY (resolved_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- (Allows Mobile App and ESP32 to read & write freely)
-- ========================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_climate_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Allow Public/Anon Access for Development & ESP32 Telemetry
CREATE POLICY "Public Read/Write Accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Devices" ON devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Readings" ON sensor_readings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Climate" ON daily_climate_summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Alerts" ON emergency_alerts FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for instant live WebSocket sync on phones
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_alerts;

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

-- Insert Default Admin Account (PIN: 1234)
INSERT INTO accounts (id, username, email, password_hash, door_passkey_hash, role, status)
VALUES (
    'acc-admin-01',
    'admin',
    'admin@smarthome.local',
    '$2a$12$e8x/QWbK9e/e0H5b.7o2O.O3H8sN.e.X4Q6Z8N8sQ7o8Q6sQ6Z8N8',
    '1234',
    'admin',
    'active'
);

-- Insert Default Devices
INSERT INTO devices (id, mac_address, name, device_type, room_location, ip_address, status, signal_strength, battery_level)
VALUES 
    ('dev-door-01', 'B8:27:EB:44:11:01', 'Front Main Entrance Lock', 'door_lock', 'Main Entrance', '192.168.1.101', 'active', 98, 92),
    ('dev-climate-01', 'B8:27:EB:44:11:02', 'Living Room Climate Sensor (DHT22)', 'climate_sensor', 'Living Room', '192.168.1.102', 'active', 95, 88),
    ('dev-smoke-01', 'B8:27:EB:44:11:03', 'Kitchen Smoke & Gas Detector (MQ-2)', 'smoke_detector', 'Kitchen', '192.168.1.103', 'active', 91, 97);

-- Insert Initial System Boot Activity Log
INSERT INTO activity_logs (account_id, actor_name, device_id, event_category, action_description, status_result)
VALUES 
    ('acc-admin-01', 'System Boot', 'dev-door-01', 'SYSTEM', 'Smart Home Gateway initialized with 3 registered devices', 'SUCCESS'),
    ('acc-admin-01', 'admin', 'dev-door-01', 'AUTH', 'Administrator logged into system', 'SUCCESS'),
    ('acc-admin-01', 'admin', 'dev-door-01', 'DOOR', 'Door locked with default passkey security', 'SUCCESS');

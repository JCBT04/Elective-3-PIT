-- 1. DATABASE SETUP
CREATE DATABASE IF NOT EXISTS it411_db_teves;
USE it411_db_teves;

-- 2. TABLE CREATION

-- Table for registered RFID tags
CREATE TABLE rfid_reg (
    rfid_data CHAR(12) PRIMARY KEY,
    rfid_status BOOLEAN NOT NULL DEFAULT TRUE,
    registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for all RFID access logs
CREATE TABLE rfid_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    time_log TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rfid_data CHAR(12) NOT NULL,
    rfid_status BOOLEAN NOT NULL,
    access_granted BOOLEAN NOT NULL,
    INDEX idx_rfid_data (rfid_data),
    INDEX idx_time_log (time_log)
);

-- 3. DATA INSERTION

-- Insert example data into rfid_reg
INSERT INTO rfid_reg (rfid_data, rfid_status) VALUES
('0AB3C4D5E6F7', TRUE),  -- Active RFID tag
('112233445566', TRUE),  -- Another active tag
('A0B1C2D3E4F5', FALSE), -- Inactive/Lost tag
('FE6C0004', TRUE);      -- Active tag

-- Insert example data into rfid_logs
INSERT INTO rfid_logs (time_log, rfid_data, rfid_status, access_granted) VALUES
('2025-11-29 14:00:00', '0AB3C4D5E6F7', TRUE, TRUE),    -- Registered & Active: Access Granted
('2025-11-29 14:01:30', '112233445566', TRUE, TRUE),    -- Registered & Active: Access Granted
('2025-11-29 14:02:15', '0AB3C4D5E6F7', TRUE, TRUE),    -- Registered & Active: Access Granted
('2025-11-29 14:05:40', 'F0E1D2C3B4A5', FALSE, FALSE),  -- Unregistered: Access Denied
('2025-11-29 14:10:05', 'A0B1C2D3E4F5', FALSE, FALSE);  -- Registered but Inactive: Access Denied
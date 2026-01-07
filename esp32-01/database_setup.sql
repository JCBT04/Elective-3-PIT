-- 1. DATABASE SETUP
CREATE DATABASE IF NOT EXISTS it411_db_teves;
USE it411_db_teves;


-- 2. TABLE CREATION


-- Table for registered RFID tags
CREATE TABLE rfid_reg (
    rfid_data VARCHAR(255) PRIMARY KEY,
    rfid_status BOOLEAN NOT NULL
);

-- Table for all RFID access logs
CREATE TABLE rfid_logs (
    time_log DATETIME NOT NULL,
    rfid_data VARCHAR(255) NOT NULL, FOREIGN KEY REFERENCES rfid_reg(rfid_data),
    rfid_status BOOLEAN);


-- 3. DATA INSERTION


-- Insert example data into rfid_reg
INSERT INTO rfid_reg (rfid_data, rfid_status) VALUES
('0AB3C4D5E6F7', TRUE),  -- Active RFID tag
('112233445566', TRUE),  -- Another active tag
('A0B1C2D3E4F5', FALSE),
('FE6C0004', TRUE); -- Inactive/Lost tag

-- Insert example data into rfid_logs
INSERT INTO rfid_logs (time_log, rfid_data, rfid_status) VALUES
('2025-11-29 14:00:00', '0A:B3:C4:D5:E6:F7', TRUE),   -- Successful entry
('2025-11-29 14:01:30', '11:22:33:44:55:66', TRUE),   -- Successful entry
('2025-11-29 14:02:15', '0A:B3:C4:D5:E6:F7', TRUE),   -- Successful exit/another entry
('2025-11-29 14:05:40', 'F0:E1:D2:C3:B4:A5', FALSE),  -- Unregistered tag (Access Denied)
('2025-11-29 14:10:05', 'A0:B1:C2:D3:E4:F5', FALSE);  -- Registered but Inactive tag (Access Denied)
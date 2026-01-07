<?php
// rfid_handler.php
// PHP backend for ESP32 RFID system

// Set timezone to Asia/Taipei (UTC+8)
date_default_timezone_set('Asia/Taipei');

// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "it411_db_teves";

// Set response header
header('Content-Type: text/plain');

// Get RFID data from query parameter
if (!isset($_GET['rfid']) || empty($_GET['rfid'])) {
    echo "ERROR: No RFID data received";
    exit;
}

$rfid = $_GET['rfid'];

// Create database connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo "ERROR: Database connection failed - " . $conn->connect_error;
    exit;
}

// Prepare SQL statement to check if RFID exists in rfid_reg
$stmt = $conn->prepare("SELECT rfid_status FROM rfid_reg WHERE rfid_data = ?");
$stmt->bind_param("s", $rfid);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // RFID found in database
    $row = $result->fetch_assoc();
    $current_status = $row['rfid_status'];
    
    // Toggle status: if 0 display 1, if 1 display 0
    $display_status = ($current_status == 0) ? 1 : 0;
    
    // Update the status in database (toggle it)
    $new_status = $display_status;
    $update_stmt = $conn->prepare("UPDATE rfid_reg SET rfid_status = ? WHERE rfid_data = ?");
    $update_stmt->bind_param("is", $new_status, $rfid);
    $update_stmt->execute();
    $update_stmt->close();
    
    // Log the activity in rfid_logs table
    $current_time = date('Y-m-d H:i:s');
    $log_stmt = $conn->prepare("INSERT INTO rfid_logs (time_log, rfid_data, rfid_status) VALUES (?, ?, ?)");
    $log_stmt->bind_param("ssi", $current_time, $rfid, $display_status);
    $log_stmt->execute();
    $log_stmt->close();
    
    // Send response
    echo "STATUS:" . $display_status;
    
} else {
    // RFID not found in database
    
    // Log the activity in rfid_logs table with NULL status to indicate not found
    $current_time = date('Y-m-d H:i:s');
    $log_stmt = $conn->prepare("INSERT INTO rfid_logs (time_log, rfid_data, rfid_status) VALUES (?, ?, NULL)");
    $log_stmt->bind_param("ss", $current_time, $rfid);
    $log_stmt->execute();
    $log_stmt->close();
    
    // Send response
    echo "RFID NOT FOUND";
}

// Close statement and connection
$stmt->close();
$conn->close();
?>
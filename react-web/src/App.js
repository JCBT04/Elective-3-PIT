import React, { useState, useEffect } from 'react';
import './App.css';

// Use an environment override or relative paths so Create React App can proxy
// requests to the Sails backend during development (no Sails edits required).
const API_BASE = process.env.REACT_APP_API_BASE || '';

function App() {
  const [rfidLogs, setRfidLogs] = useState([]);
  const [rfidReg, setRfidReg] = useState([]);
  const [mqttStatus, setMqttStatus] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  // Fetch RFID logs
  const fetchRfidLogs = async () => {
    try {
      console.log('Fetching RFID logs from:', `${API_BASE}/api/rfid-logs`);
      const response = await fetch(`${API_BASE}/api/rfid-logs`);
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      if (result.success) {
        setRfidLogs(result.data.sort((a, b) => new Date(b.time_log) - new Date(a.time_log)));
        console.log('RFID logs set:', result.data.length, 'items');
      } else {
        console.error('API returned success=false:', result);
      }
    } catch (error) {
      console.error('Error fetching RFID logs:', error);
    }
  };

  // Fetch registered RFIDs
  const fetchRfidReg = async () => {
    try {
      console.log('Fetching RFID regs from:', `${API_BASE}/api/rfid-reg`);
      const response = await fetch(`${API_BASE}/api/rfid-reg`);
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      if (result.success) {
        setRfidReg(result.data);
        console.log('RFID regs set:', result.data.length, 'items');
      } else {
        console.error('API returned success=false:', result);
      }
    } catch (error) {
      console.error('Error fetching registered RFIDs:', error);
    }
  };

  // Fetch MQTT status
  const fetchMqttStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mqtt/status`);
      const result = await response.json();
      if (result.success) {
        const status = result.status;
        let statusText;
        switch (status.status) {
          case 'connected': statusText = 'MQTT: ✓ Connected'; break;
          case 'connecting': statusText = 'MQTT: Connecting...'; break;
          case 'error': statusText = 'MQTT: ✗ Error'; break;
          default: statusText = 'MQTT: Disconnected';
        }
        setMqttStatus(statusText);
      }
    } catch (error) {
      console.error('Error fetching MQTT status:', error);
      setMqttStatus('MQTT: Status unknown');
    }
  };

  // Toggle RFID status
  const toggleRfidStatus = async (rfidData, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/rfid-reg/update-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid_data: rfidData, status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        fetchRfidReg();
        fetchRfidLogs();
      } else {
        alert('Failed to update RFID status: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating RFID status:', error);
      alert('Error updating RFID status');
    }
  };

  // Test MQTT
  const testMqtt = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rfid-logs/test-mqtt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `test_${Date.now()}` })
      });
      const result = await response.json();
      if (result.success) {
        alert('MQTT test sent successfully');
      } else {
        alert('MQTT test failed');
      }
    } catch (error) {
      console.error('Error testing MQTT:', error);
      alert('Error testing MQTT');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRfidLogs(), fetchRfidReg(), fetchMqttStatus()]);
      setLoading(false);
    };
    loadData();

    // Set up intervals
    const logInterval = setInterval(fetchRfidLogs, 5000);
    const regInterval = setInterval(fetchRfidReg, 5000);
    const mqttInterval = setInterval(fetchMqttStatus, 10000);

    return () => {
      clearInterval(logInterval);
      clearInterval(regInterval);
      clearInterval(mqttInterval);
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <h2>Registered RFIDs</h2>
        <div id="registered-rfids">
          {rfidReg.length === 0 ? (
            <div className="empty-sidebar">
              <p>No registered RFIDs found</p>
            </div>
          ) : (
            rfidReg.map(item => (
              <div key={item.rfid_data} className={`rfid-item ${item.rfid_status ? 'rfid-active' : 'rfid-inactive'}`}>
                <div className="rfid-code">{item.rfid_data}</div>
                <div className="rfid-controls">
                  <div className="rfid-status">{item.rfid_status ? 'Active' : 'Inactive'}</div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={item.rfid_status}
                      onChange={(e) => toggleRfidStatus(item.rfid_data, e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="container">
          <header>
            <h1>RFID Logs</h1>
            <div className="header-controls">
              <div className="mqtt-status">{mqttStatus}</div>
              <button className="test-btn" onClick={testMqtt}>Test MQTT Connection</button>
            </div>
          </header>

          <div className="table-container">
            <table id="rfid-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>RFID</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody id="rfid-data">
                {rfidLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      <h3>No Data Available</h3>
                      <p>RFID tracking data will appear here once the database is connected.</p>
                    </td>
                  </tr>
                ) : (
                  rfidLogs.map((item, index) => {
                    let statusClass, statusText;
                    if (item.rfid_status === null) {
                      statusClass = 'status-not-found';
                      statusText = 'RFID NOT FOUND';
                    } else {
                      statusClass = item.rfid_status ? 'status-found' : 'status-not-found';
                      statusText = item.rfid_status ? '1' : '0';
                    }

                    const date = new Date(item.time_log);
                    const dateStr = date.toLocaleDateString('en-US', {
                      timeZone: 'Asia/Taipei',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                    const timeStr = date.toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Taipei',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    });
                    const datetime = `${dateStr}, ${timeStr}`;

                    return (
                      <tr key={index}>
                        <td>{index + 1}.</td>
                        <td className="rfid-cell">{item.rfid_data}</td>
                        <td className={`${statusClass}`}>{statusText}</td>
                        <td className="datetime-cell">{datetime}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

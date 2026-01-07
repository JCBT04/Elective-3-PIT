/**
 * RfidLogController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const MqttService = require('../services/MqttService');

const mqtt = require('mqtt');

module.exports = {

  /**
   * `RfidLogController.find()`
   *
   * TODO: Need to get all the RFID data from database
   * Trying to use RfidLog.find() to fetch everything
   */
  find: async function (req, res) {
    try {
      sails.log.info('RfidLogController.find called');
      // Using .find() without parameters should get all records, right?
      const logs = await RfidLog.find();
      sails.log.info(`RfidLogController.find: Retrieved ${logs.length} RFID logs`);

      // Sending back the data in JSON format so frontend can use it
      return res.json({
        success: true,
        count: logs.length,
        data: logs
      });

    } catch (err) {
      // If something breaks, send error message back
      return res.serverError({
        success: false,
        message: 'Error retrieving RFID logs',
        error: err.message
      });
    }
  },

  /**
   * `RfidLogController.findByRfidData()`
   *
   * Filter logs by specific RFID card number
   * Getting the rfid_data from URL parameter
   */
  findByRfidData: async function (req, res) {
    try {
      // Get the rfid_data from the URL params
      const rfidData = req.param('rfid_data');

      // Make sure they actually provided an rfid_data
      if (!rfidData) {
        return res.badRequest({
          success: false,
          message: 'rfid_data parameter is required'
        });
      }

      // Search for logs that match this specific RFID
      const logs = await RfidLog.find({ rfid_data: rfidData });

      // Send back the filtered results
      return res.json({
        success: true,
        count: logs.length,
        data: logs
      });

    } catch (err) {
      // Error handling
      return res.serverError({
        success: false,
        message: 'Error retrieving RFID logs',
        error: err.message
      });
    }
  },

  /**
   * `RfidLogController.findByStatus()`
   *
   * Filter by status (1 or 0 / true or false)
   * Had to figure out how to convert the string param to boolean
   */
  findByStatus: async function (req, res) {
    try {
      const status = req.param('status');

      // Check if status was provided
      if (status === undefined) {
        return res.badRequest({
          success: false,
          message: 'status parameter is required'
        });
      }

      // Converting the status to boolean - took me a while to figure this out!
      // If it's the string 'true' or actual boolean true, set to true
      const boolStatus = status === 'true' || status === true;

      // Query the database with the boolean value
      const logs = await RfidLog.find({ rfid_status: boolStatus });

      // Return the filtered data
      return res.json({
        success: true,
        count: logs.length,
        data: logs
      });

    } catch (err) {
      // Catch any errors that might happen
      return res.serverError({
        success: false,
        message: 'Error retrieving RFID logs',
        error: err.message
      });
    }
  },

  /**
   * `RfidLogController.scan()`
   *
   * Scan RFID and log the result, publish to MQTT
   * Returns 1 if RFID found and active, 0 if inactive, -1 if not found
   */
  scan: async function (req, res) {
    sails.log.info('RFID scan endpoint called');
    try {
      const rfidData = req.param('rfid_data');
      sails.log.info(`RFID data received: ${rfidData}`);

      // Validate required parameter
      if (!rfidData) {
        sails.log.warn('RFID data parameter missing');
        return res.badRequest({
          success: false,
          message: 'rfid_data parameter is required'
        });
      }

      // Check if RFID is registered
      sails.log.info(`Checking database for RFID: ${rfidData}`);
      let registeredRfid;
      try {
        registeredRfid = await RfidReg.findOne({ rfid_data: rfidData });
        sails.log.info(`Database query result: ${JSON.stringify(registeredRfid)}`);
      } catch (dbErr) {
        sails.log.error(`Database error checking RFID ${rfidData}:`, dbErr);
        return res.serverError({
          success: false,
          message: 'Database error',
          error: dbErr.message
        });
      }

      let statusValue;
      let rfidStatus;

      if (registeredRfid) {
        // RFID is registered, check status
        rfidStatus = registeredRfid.rfid_status;
        statusValue = rfidStatus ? 1 : 0;
        sails.log.info(`RFID ${rfidData} found, status: ${rfidStatus}, value: ${statusValue}`);
      } else {
        // RFID not found
        rfidStatus = null;
        statusValue = -1;
        sails.log.info(`RFID ${rfidData} not found, value: ${statusValue}`);
      }

      // Create log entry with GMT+8 timestamp
      const now = new Date();
      const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours for GMT+8
      const timeString = gmt8Time.toISOString().slice(0, 19).replace('T', ' ');

      sails.log.info(`Creating log entry for RFID ${rfidData} with status ${rfidStatus}`);
      let newLog;
      try {
        newLog = await RfidLog.create({
          time_log: timeString,
          rfid_data: rfidData,
          rfid_status: rfidStatus
        }).fetch();
        sails.log.info(`Log entry created successfully: ${JSON.stringify(newLog)}`);
      } catch (logErr) {
        sails.log.error(`Error creating log entry for RFID ${rfidData}:`, logErr);
        return res.serverError({
          success: false,
          message: 'Error creating log entry',
          error: logErr.message
        });
      }

      // Publish to MQTT
      sails.log.info(`About to publish MQTT status: ${statusValue} for RFID: ${rfidData}`);
      try {
        sails.log.info(`Calling MqttService.publish with value: ${statusValue}`);
        MqttService.publish(statusValue);
        sails.log.info(`MqttService.publish call completed for value: ${statusValue}`);
      } catch (mqttErr) {
        sails.log.error(`Error publishing MQTT for RFID ${rfidData}:`, mqttErr);
        // Don't return error for MQTT failure, just log it
      }

      // Return success response
      return res.json({
        success: true,
        message: 'RFID scan logged successfully',
        data: {
          rfid_data: rfidData,
          status: statusValue,
          log: newLog
        }
      });

    } catch (err) {
      // Error handling
      return res.serverError({
        success: false,
        message: 'Error processing RFID scan',
        error: err.message
      });
    }
  },

  /**
   * `RfidLogController.testMqtt()`
   *
   * Test MQTT connection and publishing
   */
  testMqtt: async function (req, res) {
    try {
      const testMessage = req.param('message') || 'test';

      sails.log.info(`Testing MQTT with message: ${testMessage}`);
      sails.log.info(`About to call MqttService.publish with: ${testMessage}`);

      MqttService.publish(testMessage);

      sails.log.info(`MqttService.publish call completed for test message: ${testMessage}`);

      return res.json({
        success: true,
        message: `MQTT test publish attempted with message: ${testMessage}`,
        note: 'Check server logs and MQTTX for the message'
      });

    } catch (err) {
      sails.log.error('Error in testMqtt:', err);
      return res.serverError({
        success: false,
        message: 'Error testing MQTT',
        error: err.message
      });
    }
  },

  /**
   * `RfidLogController.getMqttStatus()`
   *
   * Get current MQTT connection status
   */
  getMqttStatus: async function (req, res) {
    try {
      const status = MqttService.getStatus();
      const config = sails.config.custom.mqtt;

      return res.json({
        success: true,
        status: status,
        config: {
          host: config.host,
          port: config.port,
          topic: config.topic,
          clientId: config.clientId
        }
      });

    } catch (err) {
      sails.log.error('Error getting MQTT status:', err);
      return res.serverError({
        success: false,
        message: 'Error getting MQTT status',
        error: err.message
      });
    }
  }

};
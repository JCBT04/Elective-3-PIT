/**
 * RfidRegController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  /**
   * `RfidRegController.create()`
   *
   * Register a new RFID card in the database
   */
  create: async function (req, res) {
    try {
      const rfidData = req.param('rfid_data');
      const initialStatus = req.param('status') !== undefined ? req.param('status') : true; // Default to active

      // Validate required parameters
      if (!rfidData) {
        return res.badRequest({
          success: false,
          message: 'rfid_data parameter is required'
        });
      }

      // Convert status to boolean
      const boolStatus = initialStatus === 'true' || initialStatus === true || initialStatus === 1;

      // Check if RFID already exists
      const existing = await RfidReg.findOne({ rfid_data: rfidData });
      if (existing) {
        return res.badRequest({
          success: false,
          message: 'RFID already registered'
        });
      }

      // Create new RFID registration
      const newReg = await RfidReg.create({
        rfid_data: rfidData,
        rfid_status: boolStatus
      }).fetch();

      // Create initial log entry
      const now = new Date();
      const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours for GMT+8
      const timeString = gmt8Time.toISOString().slice(0, 19).replace('T', ' ');

      const newLog = await RfidLog.create({
        time_log: timeString,
        rfid_data: rfidData,
        rfid_status: boolStatus
      }).fetch();

      // Return success response
      return res.json({
        success: true,
        message: 'RFID registered successfully',
        data: {
          registration: newReg,
          log: newLog
        }
      });

    } catch (err) {
      // Error handling
      return res.serverError({
        success: false,
        message: 'Error registering RFID',
        error: err.message
      });
    }
  },

  /**
   * `RfidRegController.find()`
   *
   * Get all registered RFID cards from database
   */
  find: async function (req, res) {
    try {
      sails.log.info('RfidRegController.find called');
      // Fetch all registered RFIDs
      const regs = await RfidReg.find();
      sails.log.info(`RfidRegController.find: Retrieved ${regs.length} RFID registrations`);

      // Return the data in JSON format
      return res.json({
        success: true,
        count: regs.length,
        data: regs
      });

    } catch (err) {
      // Error handling
      return res.serverError({
        success: false,
        message: 'Error retrieving RFID registrations',
        error: err.message
      });
    }
  },

  /**
   * `RfidRegController.findByStatus()`
   *
   * Filter registered RFIDs by status (active/inactive)
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

      // Convert to boolean
      const boolStatus = status === 'true' || status === true;

      // Query the database
      const regs = await RfidReg.find({ rfid_status: boolStatus });

      // Return filtered data
      return res.json({
        success: true,
        count: regs.length,
        data: regs
      });

    } catch (err) {
      // Error handling
      return res.serverError({
        success: false,
        message: 'Error retrieving RFID registrations',
        error: err.message
      });
    }
  },

  /**
   * `RfidRegController.updateStatus()`
   *
   * Update RFID status and create log entry
   */
  updateStatus: async function (req, res) {
    try {
      const rfidData = req.param('rfid_data');
      const newStatus = req.param('status');

      // Validate required parameters
      if (!rfidData) {
        return res.badRequest({
          success: false,
          message: 'rfid_data parameter is required'
        });
      }

      if (newStatus === undefined) {
        return res.badRequest({
          success: false,
          message: 'status parameter is required'
        });
      }

      // Convert status to boolean
      const boolStatus = newStatus === 'true' || newStatus === true || newStatus === 1;

      // Update the RFID registration status
      const updatedReg = await RfidReg.updateOne({ rfid_data: rfidData })
        .set({ rfid_status: boolStatus });

      if (!updatedReg) {
        // RFID not found - send -1 via MQTT
        sails.log.info(`RFID ${rfidData} not found, publishing -1 via MQTT`);
        MqttService.publish('-1');
        return res.notFound({
          success: false,
          message: 'RFID not found'
        });
      }

      // Create a log entry for this status change with GMT+8 timestamp
      const now = new Date();
      const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours for GMT+8
      const timeString = gmt8Time.toISOString().slice(0, 19).replace('T', ' ');

      const newLog = await RfidLog.create({
        time_log: timeString,
        rfid_data: rfidData,
        rfid_status: boolStatus
      }).fetch();

      // Publish MQTT message with status value (1 for active, 0 for inactive)
      const mqttMessage = boolStatus ? '1' : '0';
      sails.log.info(`Publishing RFID status change via MQTT: ${mqttMessage} for RFID ${rfidData}`);
      MqttService.publish(mqttMessage);

      // Return success response
      return res.json({
        success: true,
        message: 'RFID status updated successfully',
        data: {
          registration: updatedReg,
          log: newLog
        }
      });

    } catch (err) {
      // Error handling
      return res.serverError({
        success: false,
        message: 'Error updating RFID status',
        error: err.message
      });
    }
  }

};
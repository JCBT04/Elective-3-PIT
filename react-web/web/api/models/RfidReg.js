/**
 * RfidReg.js
 *
 * Model for the rfid_reg table - this is for registered RFID cards
 * Stores which RFID cards are authorized in the system
 */

module.exports = {

  attributes: {

    // Columns for the rfid_reg table
    // This table keeps track of registered RFID cards

    // rfid_data - the RFID card number (this is the primary key)
    // Set as unique because each RFID should only be registered once
    rfid_data: {
      type: 'string',
      columnType: 'varchar(255)',
      required: true,
      unique: true
    },

    // rfid_status - whether this RFID is currently active/authorized
    rfid_status: {
      type: 'boolean',
      columnType: 'boolean',
      required: true
    },

  },

  // Pointing to the correct table name in database
  tableName: 'rfid_reg',

  // Using rfid_data as the primary key since that's how the table was designed
  primaryKey: 'rfid_data',

};
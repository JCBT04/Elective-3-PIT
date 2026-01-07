/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  '/': { view: 'pages/homepage' },


  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/

  // RFID Log API Routes
  'GET /api/rfid-logs': 'RfidLogController.find',
  'GET /api/rfid-logs/by-data/:rfid_data': 'RfidLogController.findByRfidData',
  'GET /api/rfid-logs/by-status/:status': 'RfidLogController.findByStatus',
  'POST /api/rfid-logs/scan': 'RfidLogController.scan',
  'POST /api/rfid-logs/test-mqtt': 'RfidLogController.testMqtt',
  'GET /api/mqtt/status': 'RfidLogController.getMqttStatus',

  // RFID Registration API Routes
  'GET /api/rfid-reg': 'RfidRegController.find',
  'GET /api/rfid-reg/by-status/:status': 'RfidRegController.findByStatus',
  'PUT /api/rfid-reg/update-status': 'RfidRegController.updateStatus',


};

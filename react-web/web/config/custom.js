/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  // sendgridSecret: 'SG.fake.3e0Bn0qSQVnwb1E4qNPz9JZP5vLZYqjh7sn8S93oSHU',
  // stripeSecret: 'sk_test_Zzd814nldl91104qor5911gjald',
  // …

  // MQTT Configuration
  mqtt: {
    host: process.env.MQTT_HOST || '10.119.157.134',
    port: process.env.MQTT_PORT || 1883,
    topic: process.env.MQTT_TOPIC || 'RFID_LOGIN',
    clientId: process.env.MQTT_CLIENT_ID || 'Web_Teves',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    debug: process.env.MQTT_DEBUG || false
  }

};

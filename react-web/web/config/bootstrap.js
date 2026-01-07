/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async function() {

  // Get host for mobile access from config
  const host = sails.config.http.host;
  sails.log.info(`Mobile access link: http://${host}:1337`);

  // Test database connection
  try {
    const dbTest = await sails.getDatastore().sendNativeQuery('SELECT 1');
    sails.log.info('Database connection successful');
  } catch (err) {
    sails.log.error('Database connection failed:', err.message);
  }

  // Initialize MQTT service
  try {
    MqttService.init();
    sails.log.info('MQTT service initialized successfully');
  } catch (err) {
    sails.log.error('Failed to initialize MQTT service:', err.message);
  }

  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

};

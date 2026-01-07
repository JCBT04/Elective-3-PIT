/**
 * MqttService
 *
 * Service for handling MQTT publishing
 */

const mqtt = require('mqtt');

module.exports = {

  // MQTT client instance
  client: null,
  isConnected: false,
  connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'

  /**
   * Initialize MQTT connection
   */
  init: function() {
    if (this.client) {
      return; // Already initialized
    }

    this.connectionStatus = 'connecting';

    const config = sails.config.custom.mqtt;
    const brokerUrl = `mqtt://${config.host}:${config.port}`;

    sails.log.info(`Connecting to MQTT broker at ${brokerUrl} with client ID: ${config.clientId}`);
    if (config.debug) {
      sails.log.info('MQTT config:', {
        host: config.host,
        port: config.port,
        topic: config.topic,
        clientId: config.clientId,
        hasUsername: !!config.username,
        hasPassword: !!config.password
      });
    }

    const options = {
      reconnectPeriod: 1000, // Reconnect every 1 second for faster recovery
      connectTimeout: 5000, // 5 seconds timeout for faster initial connection
      clientId: config.clientId,
      keepalive: 10, // Send ping every 10 seconds
      reschedulePings: false // Don't reschedule pings on failure for faster operation
    };

    // Add authentication if provided
    if (config.username) {
      options.username = config.username;
    }
    if (config.password) {
      options.password = config.password;
    }

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionStatus = 'connected';
      if (config.debug) {
        sails.log.info('Connected to MQTT broker');
      }
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.connectionStatus = 'error';
      sails.log.error('MQTT error:', err.message);
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      if (config.debug) {
        sails.log.debug('MQTT offline');
      }
    });

    this.client.on('reconnect', () => {
      this.connectionStatus = 'connecting';
      if (config.debug) {
        sails.log.debug('Reconnecting to MQTT broker...');
      }
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      if (config.debug) {
        sails.log.debug('MQTT connection closed');
      }
    });
  },

  /**
   * Publish a message to MQTT topic
   * @param {string|number} message - The message to publish
   */
  publish: function(message) {
    sails.log.info(`MQTT publish called with message: ${message}`);

    if (!this.client) {
      sails.log.warn('MQTT client not initialized, initializing...');
      this.init();
      // Give it a moment to connect
      setTimeout(() => {
        this._doPublish(message);
      }, 100);
    } else {
      this._doPublish(message);
    }
  },

  /**
   * Internal publish method
   * @private
   */
  _doPublish: function(message) {
    const config = sails.config.custom.mqtt;
    const topic = config.topic;

    sails.log.info(`Publishing to MQTT topic ${topic}: ${message} (connected: ${this.isConnected})`);

    if (!this.client) {
      sails.log.error('MQTT client is null!');
      return;
    }

    try {
      this.client.publish(topic, message.toString(), { qos: 0, retain: false }, (err) => {
        if (err) {
          sails.log.error('MQTT publish error:', err.message);
        } else {
          sails.log.info(`✓ Successfully published to MQTT topic ${topic}: ${message}`);
        }
      });
    } catch (e) {
      sails.log.error('Exception during MQTT publish:', e.message);
    }
  },

  /**
   * Get current MQTT connection status
   * @returns {object} Status information
   */
  getStatus: function() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      hasClient: !!this.client
    };
  }

};
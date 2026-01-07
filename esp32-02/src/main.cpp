#include <WiFi.h>
#include <WiFiMulti.h>
#include <PubSubClient.h>

// Pin definitions
#define RELAY_PIN 26

// WiFi and MQTT configurations
WiFiMulti wifiMulti;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

const char* mqtt_server = "10.119.157.134";
const int mqtt_port = 1883;
const char* mqtt_topic = "RFID_LOGIN";

// Structure for WiFi credentials
struct WiFiCredentials {
    const char* ssid;
    const char* password;
};

// Array of available WiFi networks
WiFiCredentials networks[] = {
    {"Cloud Control Network", "ccv7network"},
    {"JCBT0", "jcbt0404"},
};

// Function declarations
void reconnectMQTT();
void checkWiFiConnection();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void pulseRelayOn();
void pulseRelayOff();

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    delay(100);

    // Display startup banner
    Serial.println("\n\n=================================");
    Serial.println("Teambot ESP32 Relay");
    Serial.println("=================================\n");

    // Initialize relay pin
    Serial.println("Initializing relay pin...");
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, HIGH);  // Set relay to OFF state
    delay(100);

    Serial.printf("✓ Relay Pin: GPIO %d initialized\n", RELAY_PIN);
    Serial.println("✓ Relay state: OFF (HIGH)\n");

    // Add WiFi networks to multi-connect
    for (int i = 0; i < sizeof(networks) / sizeof(networks[0]); i++) {
        wifiMulti.addAP(networks[i].ssid, networks[i].password);
        Serial.printf("Added network: %s\n", networks[i].ssid);
    }

    // Connect to WiFi
    Serial.println("\nConnecting to WiFi...");
    while (wifiMulti.run() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }

    Serial.println();
    Serial.printf("✓ WiFi connected to: %s\n", WiFi.SSID().c_str());
    Serial.printf("  IP address: %s\n", WiFi.localIP().toString().c_str());

    // Configure MQTT client
    mqttClient.setServer(mqtt_server, mqtt_port);
    mqttClient.setCallback(mqttCallback);

    // Connect to MQTT broker
    Serial.println("\nConnecting to MQTT Broker...");
    reconnectMQTT();

    Serial.println("\nSystem Ready!");
    Serial.println("=================================\n");
}

void loop() {
    // Check WiFi connection
    checkWiFiConnection();

    // Ensure MQTT connection
    if (!mqttClient.connected()) {
        reconnectMQTT();
    }
    mqttClient.loop();

    // Debug: Check for serial commands to manually control relay
    if (Serial.available()) {
        char cmd = Serial.read();
        if (cmd == '1') {
            Serial.println("Manual command: RELAY ON");
            pulseRelayOn();
            Serial.println("💡 LED: ON (manual)");
        } else if (cmd == '0') {
            Serial.println("Manual command: RELAY OFF");
            pulseRelayOff();
            Serial.println("💡 LED: OFF (manual)");
        }
    }

    delay(10);
}

void pulseRelayOn() {
    Serial.println("  [Pulsing relay contacts to ensure engagement...]");

    // Pulse the relay three times to ensure engagement
    for (int i = 0; i < 3; i++) {
        digitalWrite(RELAY_PIN, HIGH);
        delay(50);
        digitalWrite(RELAY_PIN, LOW);
        delay(50);
    }

    // Set relay to ON state
    digitalWrite(RELAY_PIN, LOW);
    delay(50);

    // Log the GPIO state
    Serial.printf("  GPIO state: %s\n", digitalRead(RELAY_PIN) == LOW ? "LOW (should be ON)" : "HIGH");
}

void pulseRelayOff() {
    Serial.println("  [Pulsing relay contacts to disengage...]");

    // Pulse the relay three times to disengage
    for (int i = 0; i < 3; i++) {
        digitalWrite(RELAY_PIN, LOW);
        delay(50);
        digitalWrite(RELAY_PIN, HIGH);
        delay(50);
    }

    // Set relay to OFF state
    digitalWrite(RELAY_PIN, HIGH);
    delay(50);

    // Log the GPIO state
    Serial.printf("  GPIO state: %s\n", digitalRead(RELAY_PIN) == HIGH ? "HIGH (should be OFF)" : "LOW");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    Serial.println("=================================");
    Serial.printf("📨 Message: %s\n", topic);

    // Convert payload to string
    String message = "";
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    Serial.printf("Content: %s\n", message.c_str());

    // Process the message
    if (message == "1") {
        Serial.println(">>> Command: RELAY ON");
        pulseRelayOn();
        Serial.println("💡 LED: ON");
    } else if (message == "0") {
        Serial.println(">>> Command: RELAY OFF");
        pulseRelayOff();
        Serial.println("💡 LED: OFF");
    } else {
        Serial.printf("⚠️  Unknown: %s\n", message.c_str());
    }

    Serial.println("=================================\n");
}

void reconnectMQTT() {
    int attempts = 0;
    while (!mqttClient.connected() && attempts < 5) {
        Serial.printf("MQTT attempt %d/5...\n", attempts + 1);

        // Generate unique client ID
        String clientId = "TeamBot_ESP32_02" + String(random(0xffff), HEX);

        if (mqttClient.connect(clientId.c_str())) {
            Serial.println("✓ MQTT Connected!");
            Serial.printf("  Broker: %s:%d\n", mqtt_server, mqtt_port);

            if (mqttClient.subscribe(mqtt_topic)) {
                Serial.printf("✓ Subscribed: %s\n", mqtt_topic);
            }
            return;
        } else {
            Serial.printf("✗ Failed, rc=%d\n", mqttClient.state());
            delay(2000);
        }
        attempts++;
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost. Reconnecting...");
        unsigned long startTime = millis();

        // Attempt reconnection for up to 10 seconds
        while (wifiMulti.run() != WL_CONNECTED && (millis() - startTime < 10000)) {
            delay(500);
            Serial.print(".");
        }

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println();
            Serial.printf("✓ Reconnected: %s\n", WiFi.SSID().c_str());
            reconnectMQTT();  // Reconnect MQTT after WiFi
        }
    }
}
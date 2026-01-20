#include <WiFi.h>
#include <WiFiMulti.h>
#include <PubSubClient.h>

// Pin definitions
#define RELAY_PIN 27

// Relay active level: set to LOW for active-low relay modules
const int RELAY_ACTIVE_LEVEL = LOW;
const int RELAY_OFF_LEVEL = (RELAY_ACTIVE_LEVEL == LOW) ? HIGH : LOW;

// WiFi and MQTT configurations
WiFiMulti wifiMulti;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

const char* mqtt_server = "192.168.254.102";
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
    {"JCBT", "jhunel123"},
    {"Redmi Note 13 Pro 5G", "jhunel123"},
    {"GlobeAtHome_41C2C", "65HF90A66Y6"},



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
    Serial.println("ESP32 Relay");
    Serial.println("=================================\n");

    // Scan for available networks first
    Serial.println("Scanning for WiFi networks...");
    int n = WiFi.scanNetworks();
    Serial.print("Scan complete. Found ");
    Serial.print(n);
    Serial.println(" networks:");
    for (int i = 0; i < n; ++i) {
        Serial.print(i + 1);
        Serial.print(": ");
        Serial.print(WiFi.SSID(i));
        Serial.print(" (");
        Serial.print(WiFi.RSSI(i));
        Serial.print(" dBm)");
        if (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) {
            Serial.println(" - Open");
        } else {
            Serial.println(" - Encrypted");
        }
    }
    Serial.println();

    // Initialize relay pin
    Serial.println("Initializing relay pin...");
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, RELAY_OFF_LEVEL);  // Set relay to OFF state
    delay(100);

    Serial.printf("✓ Relay Pin: GPIO %d initialized\n", RELAY_PIN);
    Serial.printf("✓ Relay state: %s (%s)\n\n", 
                  digitalRead(RELAY_PIN) == RELAY_ACTIVE_LEVEL ? "ON" : "OFF",
                  digitalRead(RELAY_PIN) == LOW ? "LOW" : "HIGH");

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
            Serial.println("Relay: ON (manual)");
        } else if (cmd == '0') {
            Serial.println("Manual command: RELAY OFF");
            pulseRelayOff();
            Serial.println("Relay: OFF (manual)");
        }
    }

    delay(10);
}

void pulseRelayOn() {
    Serial.println("  [Setting relay to ON...]");

    // Set relay to ON state
    digitalWrite(RELAY_PIN, RELAY_ACTIVE_LEVEL);
    delay(100);

    // Log the GPIO state
    Serial.printf("  GPIO state: %s\n", digitalRead(RELAY_PIN) == RELAY_ACTIVE_LEVEL ? "ACTIVE (ON)" : "INACTIVE (OFF)");
}

void pulseRelayOff() {
    Serial.println("  [Setting relay to OFF...]");

    // Set relay to OFF state
    digitalWrite(RELAY_PIN, RELAY_OFF_LEVEL);
    delay(100);

    // Log the GPIO state
    Serial.printf("  GPIO state: %s\n", digitalRead(RELAY_PIN) == RELAY_OFF_LEVEL ? "INACTIVE (OFF)" : "ACTIVE (ON)");
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
        Serial.println("Relay: ON");
    } else if (message == "0") {
        Serial.println(">>> Command: RELAY OFF");
        pulseRelayOff();
        Serial.println("Relay: OFF");
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
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>

// Define pins for MFRC522
#define SS_PIN 5    // SDA/SS pin
#define RST_PIN 22  // Reset pin

// Function declaration
void sendToServer(String rfidData);
void reconnectMQTT();

// WiFi credentials
// const char* ssid = "Cloud Control Network";
// const char* password = "ccv7network";

const char* ssid = "JCBT0";
const char* password ="jcbt0404";


// PHP server URL
const char* serverUrl = "http://10.119.157.134/rfid_handler.php";

// MQTT broker details
const char* mqttServer = "10.119.157.134";
const int mqttPort = 1883;
const char* mqttTopic = "RFID_LOGIN";
const char* pingTopic = "ESP32_PING";

// Create MFRC522 instance
MFRC522 mfrc522(SS_PIN, RST_PIN);

// MQTT client
WiFiClient espClient;
PubSubClient client(espClient);

// MQTT status tracking
bool mqttConnected = false;

// Ping timer mi
unsigned long lastPingTime = 0;
const unsigned long pingInterval = 30000; // 30 seconds

// MQTT reconnect attempts
static int mqttReconnectAttempts = 0;
const int maxMQTTReconnectAttempts = 10;

// Function to get MQTT state string
String getMQTTStateString(int state) {
  switch (state) {
    case -4: return "Connection Timeout";
    case -3: return "Connection Lost";
    case -2: return "Connect Failed";
    case -1: return "Disconnected";
    case 0: return "Connected";
    case 1: return "Bad Protocol";
    case 2: return "Bad Client ID";
    case 3: return "Unavailable";
    case 4: return "Bad Credentials";
    case 5: return "Unauthorized";
    default: return "Unknown (" + String(state) + ")";
  }
}

void setup() {
  // Dili ko kabalo ani, si koys na bahala ani.
  Serial.begin(115200);
  while (!Serial);
  
  Serial.println("\n=================================");
  Serial.println("ESP32 RFID System Starting...");
  Serial.println("=================================\n");
  
  // Initialize SPI bus
  SPI.begin();
  
  // Initialize MFRC522
  mfrc522.PCD_Init();
  Serial.println("RFID Reader Initialized");

  // Scan for available networks first
  Serial.println("Scanning for WiFi networks...");
  int n = WiFi.scanNetworks();
  Serial.print("Scan complete. Found ");
  Serial.print(n);
  Serial.println(" networks:");
  bool networkFound = false;
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
    if (WiFi.SSID(i) == ssid) {
      networkFound = true;
      Serial.println("*** Target network found! ***");
    }
  }
  if (!networkFound) {
    Serial.println("WARNING: Target network not found in scan!");
  }

  // Connect to WiFi (connects regardless of internet availability)
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    // Setup MQTT
    client.setServer(mqttServer, mqttPort);
    client.setKeepAlive(60);  // minuto taga buhi haha
    client.setSocketTimeout(10);  // Set socket timeout to 10 seconds
    reconnectMQTT();
  } else {
    Serial.print("\nWiFi Connection Failed! Status: ");
    Serial.println(WiFi.status());
    // Print status meaning
    switch (WiFi.status()) {
      case WL_NO_SHIELD:
        Serial.println("No WiFi shield present");
        break;
      case WL_IDLE_STATUS:
        Serial.println("WiFi idle");
        break;
      case WL_NO_SSID_AVAIL:
        Serial.println("No SSID available - Network not found");
        break;
      case WL_SCAN_COMPLETED:
        Serial.println("Scan completed");
        break;
      case WL_CONNECT_FAILED:
        Serial.println("Connection failed - Wrong password or other issue");
        break;
      case WL_CONNECTION_LOST:
        Serial.println("Connection lost");
        break;
      case WL_DISCONNECTED:
        Serial.println("Disconnected");
        break;
      default:
        Serial.println("Unknown status");
        break;
    }
  }
  
  Serial.println("\nReady to scan RFID cards...\n");
}

void loop() {
  static bool wifiWasConnected = true;

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiWasConnected) {
      Serial.println("WiFi disconnected. Disconnecting MQTT...");
      client.disconnect();
      mqttConnected = false;
      wifiWasConnected = false;
    }
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(1000);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi Reconnected!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      wifiWasConnected = true;
    } else {
      Serial.println("\nWiFi Reconnection Failed!");
    }
    return;
  }

  // Connection sa amobt ni
    if (!client.connected()) {
      if (mqttConnected) {
        Serial.println("MQTT connection lost!");
        mqttConnected = false;
      }
      reconnectMQTT();
    }
    client.loop();

    // Send periodic ping
    if (client.connected() && millis() - lastPingTime > pingInterval) {
      client.publish(pingTopic, "alive");
      Serial.println("Published ping to MQTT");
      lastPingTime = millis();
    }

  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  
  // Get card UID
  String cardID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    cardID += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    cardID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardID.toUpperCase();
  
  Serial.println("==========================");
  Serial.print("Card Scanned: ");
  Serial.println(cardID);

  // Send data to server
  sendToServer(cardID);

  // Halt PICC
  mfrc522.PICC_HaltA();

  // Stop encryption on PCD
  mfrc522.PCD_StopCrypto1();

  Serial.println("==========================");

  // Delay before next read
  delay(2000);
}

void reconnectMQTT() {
  mqttReconnectAttempts = 0;
  while (!client.connected() && mqttReconnectAttempts < maxMQTTReconnectAttempts) {
    mqttReconnectAttempts++;
    Serial.print("Attempting MQTT connection (attempt ");
    Serial.print(mqttReconnectAttempts);
    Serial.print("/");
    Serial.print(maxMQTTReconnectAttempts);
    Serial.print(")...");
    if (client.connect("Teves-esp32-01")) {
      Serial.println("connected");
      mqttConnected = true;
      mqttReconnectAttempts = 0; // reset on success
      return;
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.print(" (");
      Serial.print(getMQTTStateString(client.state()));
      Serial.println(") try again in 5 seconds");
      delay(5000);
    }
  }
  if (!client.connected()) {
    Serial.println("MQTT reconnection failed after maximum attempts. Restarting ESP32...");
    delay(1000);
    ESP.restart();
  }
}

void sendToServer(String rfidData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Prepare URL with query parameter
    String url = String(serverUrl) + "?rfid=" + rfidData;
    
    Serial.print("Sending request to: ");
    Serial.println(url);
    
    // Begin HTTP connection
    http.begin(url);
    
    // Set timeouts to prevent -11 (HTTPC_ERROR_READ_TIMEOUT) errors
    http.setConnectTimeout(10000);  // 10 seconds connection timeout
    http.setTimeout(15000);          // 15 seconds read timeout
    
    // Send GET request
    int httpResponseCode = http.GET();
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Server Response: ");
      Serial.println(response);
      
      // Parse response
      if (response.indexOf("NOT FOUND") != -1) {
        Serial.println("Status: RFID NOT FOUND");
        // Publish rfid_status to MQTT
        if (client.connected()) {
          client.publish(mqttTopic, "-1");
          Serial.println("Published -1 to MQTT");
        } else {
          Serial.println("MQTT not connected, cannot publish");
        }
      } else if (response.indexOf("STATUS:") != -1) {
        // Extract status from response
        int statusIndex = response.indexOf("STATUS:");
        if (statusIndex != -1) {
          String status = response.substring(statusIndex + 7, statusIndex + 8);
          Serial.print("Status: ");
          Serial.println(status);
          // Publish rfid_status to MQTT
          if (client.connected()) {
            client.publish(mqttTopic, status.c_str());
            Serial.println("Published status to MQTT");
          } else {
            Serial.println("MQTT not connected, cannot publish");
          }
        }
      }
    } else {
      Serial.print("Error sending request. HTTP Code: ");
      Serial.println(httpResponseCode);
    }
    
    // End HTTP connection
    http.end();
  } else {
    Serial.println("WiFi not connected. Cannot send data.");
  }
}

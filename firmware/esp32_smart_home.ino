/*
  ========================================================================
  Smart Home ESP32 Microcontroller Firmware
  ========================================================================
  Hardware components:
  - ESP32 NodeMCU / DevKit V1
  - DHT11 / DHT22 (Temperature & Humidity Sensor) on GPIO 4
  - MQ-2 / MQ-135 (Smoke & Gas Sensor) on GPIO 34 (Analog/Digital)
  - Servo Motor / Solenoid Relay (Door Lock Mechanism) on GPIO 18
  - Active Buzzer (Emergency Siren) on GPIO 19
  - Status LED on GPIO 2
  ========================================================================
*/

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>

// --- PIN CONFIGURATION ---
#define DHTPIN 4
#define DHTTYPE DHT22        // Change to DHT11 if using DHT11
#define SMOKE_PIN 34         // Analog pin for MQ-2 smoke sensor
#define SERVO_PIN 18         // Pin for Door Servo Motor
#define BUZZER_PIN 19        // Pin for Siren/Buzzer
#define LED_PIN 2            // Onboard Status LED

// --- WI-FI CREDENTIALS ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- GLOBAL INSTANCES & STATE ---
DHT dht(DHTPIN, DHTTYPE);
Servo doorServo;
WebServer server(80);

bool isLocked = true;
bool isAlarming = false;
float currentTemp = 24.0;
float currentHumidity = 50.0;
bool smokeDetected = false;
int smokeThreshold = 400; // Calibrate based on MQ-2 analog reading (0 - 4095)

unsigned long lastSensorRead = 0;
const long sensorInterval = 3000; // Read sensors every 3 seconds

// --- JSON RESPONSE UTILITY WITH CORS ---
void sendCorsHeader() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Handle CORS preflight options request
void handleOptions() {
  sendCorsHeader();
  server.send(204);
}

// --- API ENDPOINT: GET /api/status ---
// Returns complete telemetry to the React/Capacitor app
void handleGetStatus() {
  sendCorsHeader();
  
  StaticJsonDocument<512> doc;
  doc["deviceId"] = "ESP32-SMART-HUB-01";
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["isLocked"] = isLocked;
  doc["temperature"] = currentTemp;
  doc["humidity"] = currentHumidity;
  doc["smokeActive"] = smokeDetected;
  doc["isAlarming"] = isAlarming;
  doc["signalStrength"] = map(WiFi.RSSI(), -100, -30, 0, 100);
  doc["uptimeSeconds"] = millis() / 1000;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// --- API ENDPOINT: POST /api/door ---
// Receives { "action": "lock" } or { "action": "unlock" }
void handleDoorControl() {
  sendCorsHeader();
  
  if (server.hasArg("plain") == false) {
    server.send(400, "application/json", "{\"error\":\"Missing body\"}");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  const char* action = doc["action"];
  
  if (isAlarming && strcmp(action, "lock") == 0) {
    server.send(403, "application/json", "{\"error\":\"Cannot lock door during emergency alarm\"}");
    return;
  }

  if (strcmp(action, "unlock") == 0) {
    isLocked = false;
    doorServo.write(90); // 90 degrees = Unlocked
    digitalWrite(LED_PIN, HIGH);
  } else if (strcmp(action, "lock") == 0) {
    isLocked = true;
    doorServo.write(0);  // 0 degrees = Locked
    digitalWrite(LED_PIN, LOW);
  }

  StaticJsonDocument<256> res;
  res["success"] = true;
  res["isLocked"] = isLocked;
  res["message"] = isLocked ? "Door locked successfully" : "Door unlocked successfully";

  String response;
  serializeJson(res, response);
  server.send(200, "application/json", response);
}

// --- API ENDPOINT: POST /api/reset-alarm ---
void handleResetAlarm() {
  sendCorsHeader();
  isAlarming = false;
  smokeDetected = false;
  digitalWrite(BUZZER_PIN, LOW);
  
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Emergency alarm reset\"}");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize Pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(SMOKE_PIN, INPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  // Initialize Servo
  doorServo.attach(SERVO_PIN);
  doorServo.write(0); // Start locked

  // Initialize DHT
  dht.begin();

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("ESP32 Local IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("ESP32 MAC Address: ");
  Serial.println(WiFi.macAddress());

  // Setup Web Server Routes
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/status", HTTP_GET, handleGetStatus);
  
  server.on("/api/door", HTTP_OPTIONS, handleOptions);
  server.on("/api/door", HTTP_POST, handleDoorControl);

  server.on("/api/reset-alarm", HTTP_OPTIONS, handleOptions);
  server.on("/api/reset-alarm", HTTP_POST, handleResetAlarm);

  server.begin();
  Serial.println("HTTP REST Server running on port 80");
}

void loop() {
  server.handleClient();

  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorRead >= sensorInterval) {
    lastSensorRead = currentMillis;

    // 1. Read Temperature & Humidity
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;
    if (!isnan(h)) currentHumidity = h;

    // 2. Read Smoke / Gas Sensor
    int rawSmoke = analogRead(SMOKE_PIN);
    smokeDetected = (rawSmoke > smokeThreshold);

    // 3. Safety Check Failsafe: Emergency Auto-Unlock
    if (currentTemp >= 45.0 || smokeDetected) {
      if (!isAlarming) {
        isAlarming = true;
        isLocked = false;
        doorServo.write(90); // Auto-unlock door for safe exit
        digitalWrite(BUZZER_PIN, HIGH); // Sound siren
        Serial.println("🚨 EMERGENCY DETECTED! Auto-unlocking door.");
      }
    } else if (!smokeDetected && currentTemp < 45.0 && !isAlarming) {
      digitalWrite(BUZZER_PIN, LOW);
    }
  }
}

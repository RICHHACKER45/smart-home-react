/*
  ========================================================================================
   ESP32 SMART HOME CONTROLLER & SENSOR GATEWAY (360° SERVO & SENSOR EDITION)
  ========================================================================================
   Hardware Connected:
    - ESP32 Development Board (ESP-WROOM-32) on Expansion Board
    - 🚪 360° Continuous Rotation Servo Motor on GPIO 18 (Door Lock Mechanism)
         * UNLOCK / OPEN = Rotates Clockwise ~90° and STOPS
         * LOCK / CLOSE   = Rotates Counter-Clockwise ~90° and STOPS
    - 🚨 MQ-2 Gas / Smoke Sensor on GPIO 34 (Analog AO on ADC1)
    - 🔊 5V Active-Low Buzzer on GPIO 23 (Tri-State High-Z: 0 hum when idle, loud on alarm)
    - 🌡️ DHT11 / DHT22 Sensor on GPIO 4 (Temperature Limit set to 40.0°C)
    - 💡 Built-in Blue LED on GPIO 2 (WiFi & Alarm Indicator)

   360° Continuous Servo Control Explained:
    - On a 360° servo, write(90) = STOP, write(140) = Spin CW, write(40) = Spin CCW.
    - To perform a clean 90° turn: We spin at a controlled speed for ~350ms, then command
      write(90) (STOP) and detach to prevent any continuous spinning or motor jitter!
  ========================================================================================
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <DHT.h>
#include <ESP32Servo.h>

// ===================================================== 
//  1. HARDWARE PIN DEFINITIONS & SETTINGS
// =====================================================
#define SERVO_PIN    18      // Servo Motor Signal (Yellow/Orange wire)
#define MQ2_PIN      34      // MQ-2 Analog AO (ADC1 channel, 100% WiFi safe)
#define BUZZER_PIN   23      // Buzzer Signal pin (GPIO 23)
#define DHT_PIN      4       // DHT11 or DHT22 Data pin (GPIO 4)
#define LED_PIN      2       // ESP32 Onboard Blue LED (GPIO 2)

#define DHT_TYPE     DHT11   // Change to DHT22 if using white DHT22 sensor

// Wi-Fi Configuration (Dynamic Captive Portal via WiFiManager)
// The ESP32 will auto-connect to the last saved network.
// If it fails, it will broadcast a hotspot named "SmartHome-Setup" for you to configure it.

// =====================================================
//  DOOR HINGE (BISAGRA) 360° CALIBRATION SETTINGS
// =====================================================
const int SERVO_STOP_SPEED    = 90;   // 90 = Complete Stop (Neutral / Electronic Brake)
const int DOOR_OPEN_SPEED     = 130;  // Controlled Clockwise speed to swing door open (Push)
const int DOOR_CLOSE_SPEED    = 60;   // Controlled Counter-Clockwise speed to pull door closed (Pull)

// ⏱️ TUNING FOR YOUR PHYSICAL HINGE:
// - Increase OPEN_TIME (e.g. 380) if door doesn't push open 90°
// - Decrease OPEN_TIME (e.g. 260) if door swings too far
// - Increase CLOSE_TIME (e.g. 300) if door doesn't fully reach frame
// - Decrease CLOSE_TIME (e.g. 200) if it hits frame and strains
const int DOOR_OPEN_TIME_MS   = 320;  // Milliseconds to swing door open 90 degrees
const int DOOR_CLOSE_TIME_MS  = 250;  // Milliseconds to close door against hinge/frame

// Sensor Thresholds
const int   DEFAULT_GAS_LIMIT = 1800; // Safe threshold for 12-bit ADC (0-4095)
const int   GAS_HYSTERESIS    = 100;  // Alarm release hysteresis
const float DEFAULT_TEMP_LIMIT= 40.0; // Critical heat threshold (°C) - Retained at 40°C

// =====================================================
//  2. GLOBAL INSTANCES & STATE
// =====================================================
DHT dht(DHT_PIN, DHT_TYPE);
Servo doorServo;
WebServer server(80);

// Telemetry Values
int   gasValue      = 0;
int   gasThreshold  = DEFAULT_GAS_LIMIT;
float currentTemp   = 24.5;
float currentHum    = 50.0;
float tempLimit     = DEFAULT_TEMP_LIMIT;

// State Flags
bool isDoorLocked     = true;   // Current physical door state (true = Closed/Locked, false = Open/Unlocked)
bool gasAlarmActive   = false;  // MQ-2 alarm trigger
bool tempAlarmActive  = false;  // Heat alarm trigger
bool manualAlarmTest  = false;  // Test button / command
bool isMuted          = false;  // Mute siren flag
bool isApModeActive   = false;  // Fallback hotspot active flag
bool sensorWarmedUp   = false;  // 20s warm-up grace period flag

// Timers
unsigned long bootTime          = 0;
unsigned long lastDhtReadTime   = 0;
unsigned long lastSerialPrint   = 0;
unsigned long gasSpikeStartTime = 0;

// =====================================================
//  3. HARDWARE CONTROL HELPERS
// =====================================================

/**
 * Tri-State High-Z Buzzer Driver:
 * - turnOn = true  -> OUTPUT + LOW (Active-Low pulls to GND -> Full Loudness)
 * - turnOn = false -> INPUT (Floating / High-Z -> Zero leakage current -> 100% Dead Silent)
 */
void setBuzzer(bool turnOn) {
  if (turnOn) {
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW); // Pulls PNP base to GND
  } else {
    pinMode(BUZZER_PIN, INPUT);    // High-impedance floating: completely disconnects base
  }
}

/**
 * Continuous Urgent Smoke Alarm / Siren Pattern:
 * Fast, non-stop high-urgency emergency beeping:
 * - [BEEP 180ms] --pause 120ms-- [BEEP 180ms] --pause 120ms-- (Continuous Non-Stop)
 * - Tri-State High-Z driver guarantees 100% dead silence between pulses and when idle.
 */
void updateAlarmBuzzerPattern(bool isAlarming, unsigned long currentMillis) {
  if (!isAlarming) {
    setBuzzer(false);
    return;
  }

  // 300ms continuous rapid emergency pulse cycle
  unsigned long cycle = currentMillis % 300;
  if (cycle < 180) {
    setBuzzer(true);
  } else {
    setBuzzer(false);
  }
}

/**
 * Physical Door Hinge Controller for 360° Continuous Servo:
 * - Spins for precise millisecond duration to open or close hinge.
 * - Commands write(90) then immediately calls detach() to prevent slow creeping.
 * - The internal high-ratio metal/nylon gears hold the stick/hinge firmly in place.
 */
void setDoorLock(bool lock) {
  // Prevent jamming: don't move if door is already in that position
  if (isDoorLocked == lock) {
    Serial.println("🚪 [DOOR] Already in desired position. No movement needed.");
    return;
  }

  isDoorLocked = lock;

  // 1. Attach to GPIO 18
  doorServo.attach(SERVO_PIN, 500, 2400);
  delay(30);

  if (!lock) {
    // === OPEN DOOR (Push CW ~90°) ===
    Serial.println("🚪 [DOOR] Opening Door (Clockwise)...");
    doorServo.write(DOOR_OPEN_SPEED);
    delay(DOOR_OPEN_TIME_MS);
  } else {
    // === CLOSE DOOR (Pull CCW ~90°) ===
    Serial.println("🚪 [DOOR] Closing Door (Counter-Clockwise)...");
    doorServo.write(DOOR_CLOSE_SPEED);
    delay(DOOR_CLOSE_TIME_MS);
  }

  // 2. STOP & DETACH (Essential for 360° Servos to stop continuous creeping)
  doorServo.write(SERVO_STOP_SPEED); // Neutral
  delay(60);
  doorServo.detach();                // Cut PWM pulses -> 0 creeping, 0 jitter, locked by gear train!

  Serial.print("🚪 [DOOR] Motion complete -> Fixed Position: ");
  Serial.println(lock ? "CLOSED / LOCKED" : "OPEN / UNLOCKED");
}

int readGasSensorAverage() {
  long sum = 0;
  for (int i = 0; i < 8; i++) {
    sum += analogRead(MQ2_PIN);
    delayMicroseconds(200);
  }
  return sum / 8;
}

int getWifiSignalStrengthPercent() {
  if (WiFi.status() != WL_CONNECTED) return 0;
  int rssi = WiFi.RSSI();
  if (rssi <= -100) return 0;
  if (rssi >= -50) return 100;
  return 2 * (rssi + 100);
}

// =====================================================
//  4. WEB DASHBOARD HTML
// =====================================================
const char PAGE_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32 Smart Home</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--tx:#e2e8f0;--mut:#94a3b8;--ok:#22c55e;--bad:#ef4444;--acc:#38bdf8}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--tx);padding:16px}
.wrap{max-width:600px;margin:auto}
.card{background:var(--card);border-radius:14px;padding:16px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.05)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.val{font-size:24px;font-weight:bold;margin-top:4px}
.lbl{font-size:12px;color:var(--mut)}
.banner{padding:14px;border-radius:10px;text-align:center;font-weight:bold;margin-bottom:12px;background:rgba(34,197,94,0.15);color:var(--ok)}
.banner.alarm{background:rgba(239,68,68,0.25);color:var(--bad);animation:p 1s infinite}
@keyframes p{50%{opacity:0.6}}
button{background:var(--acc);color:#082f49;border:0;border-radius:8px;padding:10px 14px;font-weight:bold;cursor:pointer;margin:4px}
button.alt{background:#334155;color:var(--tx)}
button.danger{background:var(--bad);color:#fff}
</style></head><body><div class="wrap">
<h2>🏠 ESP32 Smart Home Controller</h2>
<div class="banner" id="banner">✅ System Normal</div>

<div class="grid">
  <div class="card"><div class="lbl">DOOR POSITION</div><div class="val" id="door">--</div></div>
  <div class="card"><div class="lbl">SMOKE / GAS (MQ-2)</div><div class="val" id="gas">--</div></div>
  <div class="card"><div class="lbl">TEMPERATURE</div><div class="val" id="temp">--</div></div>
  <div class="card"><div class="lbl">HUMIDITY</div><div class="val" id="hum">--</div></div>
</div>

<div class="card">
  <div class="lbl">DOOR MECHANISM CONTROLS</div>
  <button onclick="sendDoor('unlock')">🔓 Open Door (90° Clockwise)</button>
  <button class="alt" onclick="sendDoor('lock')">🔒 Close Door (90° Counter-Clockwise)</button>
</div>

<div class="card">
  <div class="lbl">ALARM & SIREN CONTROLS</div>
  <button class="danger" onclick="sendControl('alarm=on')">🚨 Test Siren</button>
  <button class="alt" onclick="sendControl('alarm=off')">Reset Alarm</button>
  <button class="alt" id="muteBtn" onclick="toggleMute()">Mute Buzzer</button>
</div>
</div>

<script>
const $=id=>document.getElementById(id);
let muted=false;
async function update(){
  try{
    const d = await (await fetch('/api/status')).json();
    $('door').textContent = d.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED';
    $('door').style.color = d.isLocked ? '#22c55e' : '#f59e0b';
    $('gas').textContent = d.gasValue + ' / ' + d.gasThreshold;
    $('temp').textContent = d.temperature + ' °C';
    $('hum').textContent = d.humidity + ' %';
    const b = $('banner');
    if(d.isAlarming){
      b.className='banner alarm';
      b.textContent = '🚨 EMERGENCY ALARM ACTIVE!';
    } else {
      b.className='banner';
      b.textContent = '✅ System Normal & Secure';
    }
    muted=d.muted;
    $('muteBtn').textContent = muted ? 'Unmute Buzzer' : 'Mute Buzzer';
  }catch(e){}
}
async function sendDoor(act){
  await fetch('/api/door', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:act})
  });
  update();
}
async function sendControl(q){
  await fetch('/control?'+q);
  update();
}
function toggleMute(){ sendControl('mute='+(muted?'0':'1')); }
setInterval(update, 2000); update();
</script></body></html>
)rawliteral";

// =====================================================
//  5. REST API ROUTE HANDLERS (WITH FULL CORS)
// =====================================================
void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
}

void sendJson(int code, const String& jsonStr) {
  sendCorsHeaders();
  server.send(code, "application/json", jsonStr);
}

void handleStatusApi() {
  bool isAlarming = gasAlarmActive || tempAlarmActive || manualAlarmTest;
  int wifiStrength = getWifiSignalStrengthPercent();
  unsigned long uptime = (millis() - bootTime) / 1000;

  String j = "{";
  j += "\"deviceId\":\"ESP32-SmartHome-01\",";
  j += "\"macAddress\":\"" + WiFi.macAddress() + "\",";
  j += "\"ipAddress\":\"" + (isApModeActive ? "192.168.4.1" : WiFi.localIP().toString()) + "\",";
  j += "\"isLocked\":" + String(isDoorLocked ? "true" : "false") + ",";
  j += "\"temperature\":" + String(currentTemp, 1) + ",";
  j += "\"humidity\":" + String(currentHum, 1) + ",";
  j += "\"smokeActive\":" + String(gasAlarmActive ? "true" : "false") + ",";
  j += "\"isAlarming\":" + String(isAlarming ? "true" : "false") + ",";
  j += "\"signalStrength\":" + String(wifiStrength) + ",";
  j += "\"uptimeSeconds\":" + String(uptime) + ",";
  j += "\"gasValue\":" + String(gasValue) + ",";
  j += "\"gasThreshold\":" + String(gasThreshold) + ",";
  j += "\"tempLimit\":" + String(tempLimit, 1) + ",";
  j += "\"muted\":" + String(isMuted ? "true" : "false") + ",";
  j += "\"mode\":\"" + String(isApModeActive ? "hotspot" : "wifi") + "\"";
  j += "}";

  sendJson(200, j);
}

void handleDoorApi() {
  String action = "";
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    if (body.indexOf("unlock") != -1 || body.indexOf("open") != -1) action = "unlock";
    else if (body.indexOf("lock") != -1 || body.indexOf("close") != -1) action = "lock";
  }
  if (server.hasArg("action")) action = server.arg("action");
  if (server.hasArg("servo"))  action = (server.arg("servo") == "open") ? "unlock" : "lock";

  if (action == "unlock" || action == "open") {
    setDoorLock(false); // Rotate Clockwise 90° & Stop
    sendJson(200, "{\"success\":true,\"isLocked\":false,\"message\":\"Door Opened (90° CW)\"}");
  } else if (action == "lock" || action == "close") {
    setDoorLock(true);  // Rotate Counter-Clockwise 90° & Stop
    sendJson(200, "{\"success\":true,\"isLocked\":true,\"message\":\"Door Closed (90° CCW)\"}");
  } else {
    // Toggle
    setDoorLock(!isDoorLocked);
    sendJson(200, "{\"success\":true,\"isLocked\":" + String(isDoorLocked ? "true" : "false") + "}");
  }
}

void handleResetAlarmApi() {
  manualAlarmTest = false;
  isMuted = true;
  setBuzzer(false);
  Serial.println("🔇 [ALARM] Siren reset/muted via API");
  sendJson(200, "{\"success\":true,\"message\":\"Alarm reset successfully\"}");
}

void handleControlApi() {
  if (server.hasArg("alarm")) manualAlarmTest = (server.arg("alarm") == "on");
  if (server.hasArg("mute"))  isMuted = (server.arg("mute") == "1");
  if (server.hasArg("servo")) setDoorLock(server.arg("servo") == "close");
  sendJson(200, "{\"ok\":true,\"isLocked\":" + String(isDoorLocked ? "true" : "false") + "}");
}

// =====================================================
//  6. SETUP (HARDWARE INITIALIZATION)
// =====================================================
void setup() {
  Serial.begin(115200);
  bootTime = millis();

  Serial.println("\n\n================================================");
  Serial.println("   🏠 ESP32 SMART HOME CONTROLLER INITIALIZING  ");
  Serial.println("================================================");

  // 1. Initialize Buzzer & Status LED immediately
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // Turn on Blue LED to indicate power
  setBuzzer(false);            // High-Z Floating mode: completely turns OFF buzzer humming!

  // 2. Configure ADC for MQ-2 Analog Reading
  analogReadResolution(12);
  analogSetPinAttenuation(MQ2_PIN, ADC_11db); // 0V - 3.3V full range

  // 3. Initialize DHT Sensor
  dht.begin();

  // 4. Initialize Servo Timers & Keep Completely Still at Startup (Zero continuous spin)
  Serial.println("🚪 [SERVO] Initializing 360° Servo Timers on GPIO 18...");
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  doorServo.setPeriodHertz(50);
  doorServo.attach(SERVO_PIN, 500, 2400);
  doorServo.write(SERVO_STOP_SPEED); // 90 = Neutral Stop
  delay(100);
  doorServo.detach();                // 100% still on boot (no slow creeping)
  isDoorLocked = true;
  Serial.println("🚪 [SERVO] 360° Servo Initialized & Detached (0° Locked Position).\n");

  // 5. Connect to Wi-Fi dynamically using WiFiManager
  WiFi.setSleep(false);
  WiFiManager wm;
  
  Serial.println("📶 Checking for saved Wi-Fi credentials...");
  
  // wm.resetSettings(); // UNCOMMENT to wipe saved Wi-Fi credentials for testing
  
  // This connects to the last saved router.
  // If it fails or is new, it broadcasts hotspot "SmartHome-Setup" (password: 12345678)
  bool connected = wm.autoConnect("SmartHome-Setup", "12345678");

  if (connected) {
    isApModeActive = false;
    digitalWrite(LED_PIN, HIGH);
    Serial.print("🟢 Wi-Fi Connected dynamically! IP Address: http://");
    Serial.println(WiFi.localIP());
  } else {
    isApModeActive = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("⚠️ Wi-Fi Setup Portal closed without connecting. Rebooting to retry...");
    delay(3000);
    ESP.restart();
  }

  if (MDNS.begin("smarthome")) {
    Serial.println("mDNS Responder: http://smarthome.local");
  }

  // 6. Register Web Server Routes
  server.on("/", HTTP_GET, []() { server.send(200, "text/html", PAGE_HTML); });
  server.on("/api/status", HTTP_GET, handleStatusApi);
  server.on("/status", HTTP_GET, handleStatusApi);
  server.on("/api/door", HTTP_POST, handleDoorApi);
  server.on("/api/door", HTTP_GET, handleDoorApi);
  server.on("/api/reset-alarm", HTTP_POST, handleResetAlarmApi);
  server.on("/api/reset-alarm", HTTP_GET, handleResetAlarmApi);
  server.on("/control", HTTP_GET, handleControlApi);

  // CORS Preflight Handlers
  server.on("/api/status", HTTP_OPTIONS, []() { sendCorsHeaders(); server.send(204); });
  server.on("/status", HTTP_OPTIONS, []() { sendCorsHeaders(); server.send(204); });
  server.on("/api/door", HTTP_OPTIONS, []() { sendCorsHeaders(); server.send(204); });
  server.on("/api/reset-alarm", HTTP_OPTIONS, []() { sendCorsHeaders(); server.send(204); });
  server.on("/control", HTTP_OPTIONS, []() { sendCorsHeaders(); server.send(204); });

  server.begin();
  Serial.println("🌐 HTTP Web Server & REST API Ready.");

  Serial.println("\n💡 SERIAL DEBUG COMMANDS (Type in Serial Monitor at 115200 baud):");
  Serial.println(" - 'unlock' or 'open'  -> Rotates Clockwise ~90° and STOPS (Open door)");
  Serial.println(" - 'lock' or 'close'   -> Rotates Counter-Clockwise ~90° and STOPS (Close door)");
  Serial.println(" - 'buzz'              -> Test buzzer for 500ms");
  Serial.println(" - 'status'            -> Print all sensor readings");
  Serial.println("================================================\n");
}

// =====================================================
//  7. MAIN LOOP (TELEMETRY & SAFETY PROTOCOLS)
// =====================================================
void loop() {
  server.handleClient();
  unsigned long now = millis();

  // ----- 1. Serial Monitor Command Listener -----
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toLowerCase();

    if (cmd == "unlock" || cmd == "open") {
      setDoorLock(false); // Rotates CW 90° & STOPS
    } else if (cmd == "lock" || cmd == "close") {
      setDoorLock(true);  // Rotates CCW 90° & STOPS
    } else if (cmd == "buzz") {
      Serial.println("🔊 Testing Continuous Urgent Beep Pattern...");
      for (int i = 0; i < 5; i++) {
        setBuzzer(true);
        delay(180);
        setBuzzer(false);
        delay(120);
      }
    } else if (cmd == "status") {
      Serial.print("📋 Status -> Temp: "); Serial.print(currentTemp);
      Serial.print("°C | Hum: "); Serial.print(currentHum);
      Serial.print("% | Gas: "); Serial.print(gasValue);
      Serial.print(" (Limit: "); Serial.print(gasThreshold);
      Serial.print(") | Door: "); Serial.println(isDoorLocked ? "LOCKED" : "UNLOCKED");
    }
  }

  // ----- 2. MQ-2 Sensor Grace Period & Reading -----
  gasValue = readGasSensorAverage();

  // Give sensor 20 seconds to warm up after boot before arming alarm
  if (!sensorWarmedUp && (now - bootTime >= 20000)) {
    sensorWarmedUp = true;
    Serial.println("🔥 [MQ-2] Sensor warm-up complete. Gas alarm is now ARMED.");
  }

  if (sensorWarmedUp) {
    if (gasValue >= gasThreshold) {
      if (gasSpikeStartTime == 0) gasSpikeStartTime = now;
    } else {
      gasSpikeStartTime = 0;
    }

    // Must persist for 400ms before alarming to avoid noisy ADC spikes
    if (!gasAlarmActive && gasSpikeStartTime != 0 && (now - gasSpikeStartTime >= 400)) {
      gasAlarmActive = true;
      Serial.println("🚨 [ALARM] MQ-2 Smoke/Gas Spike Detected!");
    } else if (gasAlarmActive && gasValue < (gasThreshold - GAS_HYSTERESIS)) {
      gasAlarmActive = false;
      Serial.println("✅ [CLEARED] MQ-2 Gas levels normalized.");
    }
  }

  // ----- 3. Read DHT Temperature & Humidity -----
  if (now - lastDhtReadTime >= 2000) {
    lastDhtReadTime = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      currentTemp = t;
      currentHum  = h;
    }
  }

  // Extreme Heat Threshold Check (≥ 40°C as requested)
  if (!tempAlarmActive && currentTemp >= tempLimit) {
    tempAlarmActive = true;
    Serial.println("🚨 [ALARM] Critical High Heat (≥ 40°C) Detected!");
  } else if (tempAlarmActive && currentTemp <= (tempLimit - 2.0)) {
    tempAlarmActive = false;
  }

  bool isAlarming = gasAlarmActive || tempAlarmActive || manualAlarmTest;

  // ----- 4. Smoke Alarm Pulsed Siren Actuation (Beep-Beep Pattern) -----
  updateAlarmBuzzerPattern(isAlarming && !isMuted, now);

  // ----- 5. Emergency Auto-Unlock Failsafe -----
  if (isAlarming && isDoorLocked) {
    Serial.println("🔓 [FAILSAFE] Auto-Unlocking door (Rotating Clockwise 90° & STOPPING) due to Hazard!");
    setDoorLock(false); // Rotates CW 90° & STOPS
  }

  // ----- 6. Diagnostics Print to Serial Monitor Every 2s -----
  if (now - lastSerialPrint >= 2000) {
    lastSerialPrint = now;
    Serial.print("[DIAG] Temp: ");
    Serial.print(currentTemp, 1);
    Serial.print("°C (Limit: ");
    Serial.print(tempLimit, 1);
    Serial.print("°C) | Hum: ");
    Serial.print(currentHum, 1);
    Serial.print("% | MQ-2 Gas: ");
    Serial.print(gasValue);
    Serial.print(" / ");
    Serial.print(gasThreshold);
    Serial.print(sensorWarmedUp ? " [ARMED]" : " [WARMING UP...]");
    Serial.print(" | Door: ");
    Serial.print(isDoorLocked ? "LOCKED" : "UNLOCKED");
    if (isAlarming) {
      Serial.print(" | 🚨 ALARM ACTIVE!");
    }
    Serial.println();
  }
}
/*
  ============================================================
   ESP32 FULL SMART HOME DEVICE
  ============================================================
  Features
   - DHT11 temperature + humidity
   - MQ2 gas/smoke detection (auto-calibrated)
   - Buzzer alarm + servo (vent/door) when gas or heat detected
   - Built-in web dashboard (no React / npm needed): open it from
     any phone or PC on the same Wi-Fi
   - Controls: open/close vent, test alarm, mute buzzer,
     change temperature and gas limits
   - Fallback hotspot if Wi-Fi fails: "SmartHome-ESP32" / 12345678
     then open http://192.168.4.1

  Wiring
   DHT11 DATA -> GPIO4         (VCC 3.3V, GND)
   MQ2 AO     -> GPIO34        (through 10k/20k voltage divider, VCC 5V, GND)
   Servo SIG  -> GPIO18        (VCC 5V, GND)
   Buzzer     -> GPIO23 via 1k resistor + NPN transistor (see notes)
   All GND connected together

  Libraries (Library Manager):
   "DHT sensor library" (Adafruit), "Adafruit Unified Sensor", "ESP32Servo"
  Board: ESP32 Dev Module
*/

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <DHT.h>
#include <ESP32Servo.h>

// ================= EDIT THESE =================
const char* WIFI_SSID = "YOUR_WIFI_NAME";      // 2.4 GHz only
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
// ==============================================

#define DHT_PIN     4
#define MQ2_PIN     34
#define SERVO_PIN   18
#define BUZZER_PIN  23
#define DHT_TYPE    DHT11
#define BUZZER_ACTIVE_LOW false     // true if buzzer module sounds on LOW

// ---------- Settings ----------
const int   MANUAL_GAS_LIMIT = 0;   // 0 = auto-calibrate at startup
const int   GAS_MARGIN       = 400; // auto limit = clean air + margin (taasan kung may false alarm)
const int   GAS_HYST         = 80;
const float TEMP_HYST        = 2.0;
const int   SERVO_MIN        = 0;   // closed
const int   SERVO_MAX        = 90;  // open
const int   SERVO_STEP       = 6;
const unsigned long SERVO_INTERVAL = 10;
const unsigned long WARMUP_MS      = 60000;   // MQ2 needs ~1 min to stabilise before calibration
const bool  SERVO_SWEEP_ON_ALARM = false; // false = servo OPENS and STAYS open during alarm
                                          // true  = servo sweeps back and forth
const int   T_SAMPLES        = 5;         // temperature averaging (smoother, more stable)

DHT dht(DHT_PIN, DHT_TYPE);
Servo myServo;
WebServer server(80);

// ---------- State ----------
float tempHigh = 45.0;             // alarm temperature (change in dashboard too)
float tempOffset = 0.0;            // calibration: add/subtract °C to match a real thermometer
float tBuf[5]; int tCount = 0, tIdx = 0;
int   gasThreshold = 2000, gasValue = 0;
float temp = NAN, hum = NAN;

bool gasAlarm = false, tempAlarm = false, testAlarm = false, muted = false;
bool wasAlarm = false;
bool servoManualOpen = false;
bool servoAttached = false, servoMoving = false;
int  servoPos = SERVO_MIN, servoDir = 1, lastTarget = SERVO_MIN;
unsigned long lastServo = 0, lastDht = 0, servoMovedAt = 0;
bool apMode = false;
unsigned long gasAboveSince = 0;   // gas must stay above limit for a moment before alarm

// =====================================================
//  DASHBOARD (served from the ESP32)
// =====================================================
const char PAGE[] = R"rawliteral(
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Home</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--tx:#e2e8f0;--mut:#94a3b8;--ok:#22c55e;--bad:#ef4444;--acc:#38bdf8}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--tx);padding:16px}
.wrap{max-width:720px;margin:auto}
h1{font-size:20px;margin:0 0 12px;display:flex;justify-content:space-between;align-items:center}
.pill{font-size:12px;padding:3px 10px;border-radius:99px;background:var(--card)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:12px}
.card{background:var(--card);border-radius:14px;padding:14px}
.lbl{color:var(--mut);font-size:12px}
.val{font-size:28px;font-weight:600;margin-top:4px}
.sub{color:var(--mut);font-size:12px;margin-top:2px}
.banner{border-radius:14px;padding:16px;text-align:center;font-weight:700;font-size:18px;margin-bottom:12px;background:var(--ok);color:#052e16}
.banner.alarm{background:var(--bad);color:#fff;animation:b 1s infinite}
@keyframes b{50%{opacity:.6}}
button{background:var(--acc);color:#082f49;border:0;border-radius:10px;padding:10px 14px;font-weight:600;font-size:14px;cursor:pointer}
button.alt{background:#334155;color:var(--tx)}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center}
input{width:90px;padding:8px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:var(--tx)}
canvas{width:100%;height:80px;display:block;margin-top:6px}
</style></head><body><div class="wrap">
<h1>🏠 Smart Home <span class="pill" id="conn">connecting...</span></h1>

<div class="banner" id="banner">✅ All normal</div>

<div class="grid">
  <div class="card"><div class="lbl">🌡 Temperature</div><div class="val" id="temp">--</div><div class="sub" id="tlim"></div></div>
  <div class="card"><div class="lbl">💧 Humidity</div><div class="val" id="hum">--</div></div>
  <div class="card"><div class="lbl">🔥 Gas level</div><div class="val" id="gas">--</div><div class="sub" id="glim"></div></div>
  <div class="card"><div class="lbl">🪟 Vent / Door</div><div class="val" id="servo">--</div></div>
</div>

<div class="card" style="margin-bottom:12px">
  <div class="lbl">Controls</div>
  <div class="row">
    <button onclick="send('servo=open')">Open vent</button>
    <button class="alt" onclick="send('servo=close')">Close vent</button>
  </div>
  <div class="row">
    <button onclick="send('alarm=on')">Test alarm ON</button>
    <button class="alt" onclick="send('alarm=off')">Alarm OFF</button>
    <button class="alt" id="muteBtn" onclick="toggleMute()">Mute buzzer</button>
  </div>
</div>

<div class="card" style="margin-bottom:12px">
  <div class="lbl">Settings</div>
  <div class="row">Temp limit (°C) <input id="tIn" type="number" step="0.5"><button onclick="send('tempLimit='+tIn.value)">Save</button></div>
  <div class="row">Gas limit (0-4095) <input id="gIn" type="number"><button onclick="send('gasLimit='+gIn.value)">Save</button></div>
  <div class="row">Temp calibration (°C, + or -) <input id="oIn" type="number" step="0.5"><button onclick="send('tempOffset='+oIn.value)">Save</button></div>
</div>

<div class="card" style="margin-bottom:12px"><div class="lbl">Temperature history</div><canvas id="c1"></canvas></div>
<div class="card"><div class="lbl">Gas history</div><canvas id="c2"></canvas></div>
</div>

<script>
const $=id=>document.getElementById(id);
const tH=[],gH=[];let muted=false,filled=false;
function draw(c,a,col){
  const x=c.getContext('2d'),w=c.width=c.clientWidth*2,h=c.height=160;
  x.clearRect(0,0,w,h); if(a.length<2)return;
  const mn=Math.min(...a),mx=Math.max(...a),r=(mx-mn)||1;
  x.strokeStyle=col;x.lineWidth=3;x.beginPath();
  a.forEach((v,i)=>{const px=i/(a.length-1)*w,py=h-10-((v-mn)/r)*(h-20);i?x.lineTo(px,py):x.moveTo(px,py)});
  x.stroke();
}
async function load(){
  try{
    const d=await (await fetch('/status')).json();
    $('conn').textContent='🟢 Online ('+d.mode+')';
    $('temp').textContent=d.temp===null?'--':d.temp+' °C';
    $('hum').textContent=d.hum===null?'--':d.hum+' %';
    $('gas').textContent=d.gas;
    $('tlim').textContent='limit '+d.tempLimit+' °C';
    $('glim').textContent='limit '+d.gasThreshold;
    $('servo').textContent=d.servoOpen?'Open':'Closed';
    const b=$('banner');
    if(d.alarm){
      let why=[];if(d.gasAlarm)why.push('GAS');if(d.tempAlarm)why.push('HEAT');if(d.testAlarm)why.push('TEST');
      b.className='banner alarm';b.textContent='⚠ ALARM: '+why.join(' + ');
    }else{b.className='banner';b.textContent='✅ All normal';}
    muted=d.muted;$('muteBtn').textContent=muted?'Unmute buzzer':'Mute buzzer';
    if(!filled){$('tIn').value=d.tempLimit;$('gIn').value=d.gasThreshold;$('oIn').value=d.tempOffset;filled=true;}
    if(d.temp!==null){tH.push(d.temp);if(tH.length>60)tH.shift();}
    gH.push(d.gas);if(gH.length>60)gH.shift();
    draw($('c1'),tH,'#f97316');draw($('c2'),gH,'#38bdf8');
  }catch(e){$('conn').textContent='🔴 Offline';}
}
async function send(q){try{await fetch('/control?'+q);}catch(e){} load();}
function toggleMute(){send('mute='+(muted?'0':'1'));}
setInterval(load,2000);load();
</script></body></html>
)rawliteral";

// =====================================================
//  HELPERS
// =====================================================
void buzzer(bool on) { digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_LOW ? !on : on); }

int readGas() {
  long sum = 0;
  for (int i = 0; i < 5; i++) { sum += analogRead(MQ2_PIN); delayMicroseconds(300); }
  return sum / 5;
}

void servoAttachIfNeeded() {
  if (!servoAttached) {
    myServo.setPeriodHertz(50);
    myServo.attach(SERVO_PIN, 500, 2400);
    servoAttached = true;
  }
}

void waitWithServer(unsigned long ms) {
  unsigned long t0 = millis();
  while (millis() - t0 < ms) { server.handleClient(); delay(5); }
}

// =====================================================
//  WEB HANDLERS
// =====================================================
void sendJson(int code, const String& body) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(code, "application/json", body);
}

void handleRoot() { server.send(200, "text/html", PAGE); }

void handleStatus() {
  bool alarm = gasAlarm || tempAlarm || testAlarm;
  String j = "{";
  j += "\"temp\":" + (isnan(temp) ? String("null") : String(temp, 1)) + ",";
  j += "\"hum\":"  + (isnan(hum)  ? String("null") : String(hum, 1))  + ",";
  j += "\"gas\":" + String(gasValue) + ",";
  j += "\"gasThreshold\":" + String(gasThreshold) + ",";
  j += "\"tempLimit\":" + String(tempHigh, 1) + ",";
  j += "\"tempOffset\":" + String(tempOffset, 1) + ",";
  j += "\"gasAlarm\":"  + String(gasAlarm  ? "true" : "false") + ",";
  j += "\"tempAlarm\":" + String(tempAlarm ? "true" : "false") + ",";
  j += "\"testAlarm\":" + String(testAlarm ? "true" : "false") + ",";
  j += "\"alarm\":"     + String(alarm     ? "true" : "false") + ",";
  j += "\"muted\":"     + String(muted     ? "true" : "false") + ",";
  j += "\"servoOpen\":" + String(servoManualOpen ? "true" : "false") + ",";
  j += "\"mode\":\"" + String(apMode ? "hotspot" : "wifi") + "\"";
  j += "}";
  sendJson(200, j);
}

void handleControl() {
  if (server.hasArg("alarm"))  testAlarm = (server.arg("alarm") == "on");
  if (server.hasArg("mute"))   muted = (server.arg("mute") == "1");
  if (server.hasArg("servo"))  servoManualOpen = (server.arg("servo") == "open");
  if (server.hasArg("tempLimit")) {
    float v = server.arg("tempLimit").toFloat();
    if (v >= 10 && v <= 80) tempHigh = v;
  }
  if (server.hasArg("tempOffset")) {
    float v = server.arg("tempOffset").toFloat();
    if (v >= -15 && v <= 15) {
      // keep the displayed temperature continuous when the offset changes
      if (!isnan(temp)) temp += (v - tempOffset);
      tempOffset = v;
    }
  }
  if (server.hasArg("gasLimit")) {
    int v = server.arg("gasLimit").toInt();
    if (v >= 100 && v <= 4095) gasThreshold = v;
  }
  sendJson(200, "{\"ok\":true}");
}

void handleNotFound() {
  if (server.method() == HTTP_OPTIONS) { sendJson(204, ""); return; }
  sendJson(404, "{\"error\":\"not found\"}");
}

// =====================================================
//  SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  buzzer(false);

  analogReadResolution(12);
  analogSetPinAttenuation(MQ2_PIN, ADC_11db);
  dht.begin();

  // ----- Wi-Fi -----
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) { delay(500); Serial.print("."); }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected! Open on your phone/PC:  http://");
    Serial.println(WiFi.localIP());
  } else {
    apMode = true;
    WiFi.mode(WIFI_AP);
    WiFi.softAP("SmartHome-ESP32", "12345678");
    Serial.println("Wi-Fi failed -> hotspot mode.");
    Serial.println("Connect to Wi-Fi 'SmartHome-ESP32' (password 12345678)");
    Serial.println("then open  http://192.168.4.1");
  }

  if (MDNS.begin("smarthome")) Serial.println("Also try: http://smarthome.local");

  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/control", HTTP_GET, handleControl);
  server.onNotFound(handleNotFound);
  server.begin();

  // ----- Startup test: servo + buzzer -----
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoAttachIfNeeded();
  buzzer(false);                           // buzzer stays silent at startup
  myServo.write(SERVO_MIN); delay(400);
  myServo.write(SERVO_MAX); delay(600);    // quick servo check only
  myServo.write(SERVO_MIN); delay(600);
  myServo.detach(); servoAttached = false;

  // ----- MQ2 warm-up + calibration -----
  Serial.println("MQ2 warming up...");
  waitWithServer(WARMUP_MS);

  if (MANUAL_GAS_LIMIT > 0) {
    gasThreshold = MANUAL_GAS_LIMIT;
  } else {
    long sum = 0;
    for (int i = 0; i < 30; i++) { sum += readGas(); waitWithServer(100); }
    int baseline = sum / 30;
    gasThreshold = baseline + GAS_MARGIN;
    Serial.print("Clean-air baseline: "); Serial.println(baseline);
  }
  Serial.print("Gas limit: "); Serial.println(gasThreshold);
  Serial.println("System ready.");
}

// =====================================================
//  LOOP
// =====================================================
void loop() {
  server.handleClient();
  unsigned long now = millis();

  // ----- Gas -----
  gasValue = readGas();
  if (gasValue >= gasThreshold) { if (gasAboveSince == 0) gasAboveSince = now; }
  else gasAboveSince = 0;
  if (!gasAlarm && gasAboveSince != 0 && now - gasAboveSince >= 500) gasAlarm = true;   // must stay high 0.5 s
  else if (gasAlarm && gasValue < gasThreshold - GAS_HYST) gasAlarm = false;

  // ----- Temperature / humidity -----
  if (now - lastDht >= 2000) {
    lastDht = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      tBuf[tIdx] = t;
      tIdx = (tIdx + 1) % T_SAMPLES;
      if (tCount < T_SAMPLES) tCount++;
      float s = 0;
      for (int i = 0; i < tCount; i++) s += tBuf[i];
      temp = (s / tCount) + tempOffset;      // average of last readings + calibration
      hum  = h;
    }
  }
  if (!isnan(temp)) {
    if (!tempAlarm && temp >= tempHigh) tempAlarm = true;
    else if (tempAlarm && temp <= tempHigh - TEMP_HYST) tempAlarm = false;
  }

  bool alarm = gasAlarm || tempAlarm || testAlarm;

  // ----- Alarm ended: un-mute for next time -----
  if (!alarm && wasAlarm) muted = false;

  // ----- Buzzer -----
  buzzer(alarm && !muted);

  // ----- Servo -----
  if (alarm) {
    servoAttachIfNeeded();
    servoMoving = false;
    if (!wasAlarm) {                       // open instantly on detection
      servoPos = SERVO_MAX; servoDir = -1;
      myServo.write(SERVO_MAX); lastServo = now;
    }
    if (SERVO_SWEEP_ON_ALARM) {
      if (now - lastServo >= SERVO_INTERVAL) {
        lastServo = now;
        servoPos += servoDir * SERVO_STEP;
        if (servoPos >= SERVO_MAX) { servoPos = SERVO_MAX; servoDir = -1; }
        if (servoPos <= SERVO_MIN) { servoPos = SERVO_MIN; servoDir = 1; }
        myServo.write(servoPos);
      }
    } else {
      // hold the servo fully OPEN for as long as the alarm lasts
      if (now - lastServo >= 200) { lastServo = now; myServo.write(SERVO_MAX); }
    }
    lastTarget = -1;                       // force re-position after alarm
  } else {
    // follow the manual open/close button, then detach so it stays quiet
    int target = servoManualOpen ? SERVO_MAX : SERVO_MIN;
    if (target != lastTarget) {
      servoAttachIfNeeded();
      myServo.write(target);
      lastTarget = target;
      servoPos = target;
      servoMoving = true;
      servoMovedAt = now;
    }
    if (servoAttached && servoMoving && now - servoMovedAt > 800) {
      myServo.detach();
      servoAttached = false;
      servoMoving = false;
    }
  }

  wasAlarm = alarm;

  // ----- Debug line every second (Serial Monitor, 115200) -----
  static unsigned long lastPrint = 0;
  if (now - lastPrint >= 1000) {
    lastPrint = now;
    Serial.print("Gas: ");  Serial.print(gasValue);
    Serial.print(" (limit "); Serial.print(gasThreshold);
    Serial.print(") | Temp: "); Serial.print(temp);
    Serial.print(" C | Hum: "); Serial.print(hum);
    Serial.print(" % | ");
    if (alarm) {
      Serial.print("ALARM ->");
      if (gasAlarm)  Serial.print(" GAS");
      if (tempAlarm) Serial.print(" HEAT");
      if (testAlarm) Serial.print(" TEST");
      Serial.println();
    } else {
      Serial.println("Normal");
    }
  }
}
`
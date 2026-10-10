# ESP32 Smart Home Integration & Communication Guide

This document outlines all firmware additions, architectural changes, REST API specifications, and the communication flow between the **ESP32 Microcontroller Board** and the **React + Ionic Mobile Application**.

---

## 📑 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [What Was Added &amp; Enhanced in the Code](#2-what-was-added--enhanced-in-the-code)
3. [Communication Flow &amp; Sequence Diagram](#3-communication-flow--sequence-diagram)
4. [REST API Endpoints Specification](#4-rest-api-endpoints-specification)
5. [Hardware Pinout &amp; Wiring](#5-hardware-pinout--wiring)
6. [How to Flash, Configure, &amp; Test](#6-how-to-flash-configure--test)

---

## 1. System Architecture Overview

The system operates across a local network (Wi-Fi LAN) where the mobile application sends HTTP requests directly to the ESP32's internal web server.

```
┌────────────────────────────────────────────────────────┐
│               React + Ionic Mobile App                 │
│      (Dashboard, Passkey Modal, Telemetry Charts)      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP GET / POST (JSON)
                            │ Local Wi-Fi (LAN)
                            ▼
┌────────────────────────────────────────────────────────┐
│            ESP32 Microcontroller (WebServer)           │
│           (firmware/esp32_smart_home.ino)              │
└──────┬──────────────┬───────────────┬────────────┬─────┘
       │              │               │            │
       ▼              ▼               ▼            ▼
┌────────────┐ ┌─────────────┐ ┌────────────┐ ┌─────────┐
│ Servo Lock │ │ MQ-2 Smoke  │ │ Piezo Siren│ │ DHT11/22│
│  (GPIO 18) │ │  (GPIO 34)  │ │  (GPIO 23) │ │ (GPIO 4)│
└────────────┘ └─────────────┘ └────────────┘ └─────────┘
```

---

## 2. What Was Added & Enhanced in the Code

### A. In the ESP32 Firmware (`firmware/esp32_smart_home.ino`)

1. **Unified Dual REST API Endpoints**:

   - Added `/api/status`, `/api/door`, and `/api/reset-alarm` matching the exact JSON structure expected by the React mobile app.
   - Maintained backward compatibility with `/status` and `/control`.
2. **Full Cross-Origin Resource Sharing (CORS) & Preflight**:

   - Injected headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
   - Handled `HTTP_OPTIONS` preflight requests so mobile browsers and Android WebViews never drop connections.
3. **Emergency Auto-Unlock Failsafe**:

   - If the MQ-2 sensor detects smoke/gas or DHT reads critical temperature (≥ 45°C), the ESP32 automatically actuates the door servo to **90° (Unlocked)** for emergency egress.
4. **Servo Anti-Jitter & Overheating Protection**:

   - Added automatic PWM detach (`doorServo.detach()`) **800ms after motion**. This stops standard micro servos (SG90 / MG90S) from buzzing, consuming excess current, or heating up while resting.
5. **Fault-Tolerant DHT Sensor Reading**:

   - Safe fallbacks prevent crashes or invalid JSON if the DHT sensor is unplugged or during power-on initialization.
6. **Live Telemetry Calculations**:

   - Calculates Wi-Fi Signal Strength (`0%–100%`) from raw RSSI.
   - Reports uptime in seconds, MAC address, IP address, and raw gas baseline calibration.
7. **Dual Operation Modes**:

   - **Station Mode (STA)**: Connects to your home/hotspot router.
   - **Access Point Fallback (AP)**: If Wi-Fi is unreachable, creates `"SmartHome-ESP32"` (`12345678`) at `http://192.168.4.1`.
   - **Standalone Web Dashboard**: Embedded HTML dashboard at `http://<esp32_ip>/` for direct testing from any browser.

---

### B. In the Frontend Hardware Service (`src/services/hardwareService.ts`)

1. **Smart IP Sanitization**:
   - Automatically cleans entered IP addresses (removes leading `http://`, `https://`, or trailing `/`).
2. **Dual-Key Normalization**:
   - Handles both modern and legacy JSON property names (`isLocked` / `servoOpen`, `temperature` / `temp`, `smokeActive` / `gasAlarm`, `isAlarming` / `alarm`).
3. **AbortController Timeout Guards**:
   - Added 3.5s timeout guards to prevent the mobile UI from hanging if the board is powered off.

---

## 3. Communication Flow & Sequence Diagram

### Flow 1: Live Status Polling

```
Mobile App (React)                           ESP32 WebServer
       │                                            │
       │ ─── GET http://<esp32_ip>/api/status ────> │ (Reads DHT, MQ-2, Servo)
       │                                            │
       │ <── 200 OK { isLocked, temp, gas... } ─── │
       ▼                                            ▼
Updates Dashboard, Charts, & State
```

### Flow 2: Door Unlock with Passkey Verification

```
User                 Mobile App (useStore)               ESP32 WebServer
 │                             │                                │
 │ ── Enters 4-digit PIN ────> │ (Verifies SHA-256 Hash)        │
 │                             │                                │
 │                             │ ── POST /api/door {action} ──> │
 │                             │                                │ (Servo rotates 90°)
 │                             │ <── 200 OK {success: true} ─── │ (Auto-detaches in 800ms)
 │                             │                                │
 │ <── Audio Feedback & UI ─── │ (Starts 30-min Session Timer)  │
```

### Flow 3: Hazard Emergency Auto-Unlock (Autonomous)

```
MQ-2 Smoke Sensor                          ESP32 Firmware                       Mobile App
       │                                         │                                   │
       │ ── Smoke Analog Value > Threshold ────> │                                   │
       │                                         │ 1. Triggers Siren Buzzer          │
       │                                         │ 2. Actuates Servo to 90° (Unlock) │
       │                                         │                                   │
       │                                         │ <── Next Poll (GET /api/status) ─ │
       │                                         │                                   │
       │                                         │ ── 200 OK {isAlarming: true} ───> │
       │                                         │                                   ▼
       │                                         │                     Displays Emergency Red UI,
       │                                         │                     Logs Auto-Unlock Audit
```

---

## 4. REST API Endpoints Specification

### 1. `GET /api/status`

Retrieves live sensor telemetry, device metadata, and door status.

- **Response Body (`200 OK`)**:

```json
{
  "deviceId": "ESP32-SmartHome-01",
  "macAddress": "24:6F:28:XX:XX:XX",
  "ipAddress": "192.168.1.50",
  "isLocked": true,
  "temperature": 24.8,
  "humidity": 47.0,
  "smokeActive": false,
  "isAlarming": false,
  "signalStrength": 95,
  "uptimeSeconds": 1420,
  "gasValue": 450,
  "gasThreshold": 1850,
  "tempLimit": 45.0,
  "muted": false,
  "mode": "wifi"
}
```

---

### 2. `POST /api/door`

Commands the servo motor to lock or unlock the door.

- **Request Body**:

```json
{
  "action": "unlock"
}
```

*(Options: `"lock"` or `"unlock"`)*

- **Response Body (`200 OK`)**:

```json
{
  "success": true,
  "isLocked": false,
  "message": "Door Unlocked"
}
```

---

### 3. `POST /api/reset-alarm`

Silences active buzzer alarm and resets emergency test state.

- **Response Body (`200 OK`)**:

```json
{
  "success": true,
  "message": "Alarm reset successfully"
}
```

---

### 4. `GET /control`

Query-parameter endpoint for firmware controls.

- **Example**: `GET /control?tempLimit=40.0&gasLimit=1500&mute=1`

---

## 5. Hardware Pinout & Wiring

Connected via **ESP32 Dev Module + Expansion Board**:

| Component                | Pin Label               | ESP32 GPIO        | Power Voltage             | Purpose                                               |
| :----------------------- | :---------------------- | :---------------- | :------------------------ | :---------------------------------------------------- |
| **Servo Motor**    | `SIG` (Orange/Yellow) | **GPIO 18** | **5V / GND**        | Door Lock Angle:`0° = Locked`, `90° = Unlocked` |
| **MQ-2 Smoke/Gas** | `AO` (Analog Out)     | **GPIO 34** | **5V / GND**        | Analog smoke & flammable gas detection (ADC1)         |
| **Piezo Buzzer**   | `+` / `SIG`         | **GPIO 23** | **3.3V / 5V / GND** | Siren alarm buzzer for hazards                        |
| **DHT11 / DHT22**  | `DATA`                | **GPIO 4**  | **3.3V / GND**      | Ambient temperature & humidity monitoring             |
| **Status LED**     | Onboard                 | **GPIO 2**  | Built-in                  | Blinks on Wi-Fi connect, solid ON when online         |

---

## 6. How to Flash, Configure, & Test

### Step 1: Flash the ESP32

1. Open [`firmware/esp32_smart_home.ino`](firmware/esp32_smart_home.ino) in **Arduino IDE**.
2. Set your 2.4 GHz Wi-Fi credentials:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_NAME";
   const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
   ```
3. Install the required libraries in **Library Manager** (`Ctrl + Shift + I`):
   - `ESP32Servo` by Kevin Harrington
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor` by Adafruit
4. Select Board: **ESP32 Dev Module**, select your COM port, and click **Upload**.

---

### Step 2: Obtain ESP32 IP Address

1. Open the **Serial Monitor** at **115200 baud**.
2. When connected, it prints:
   ```text
   🟢 Wi-Fi Connected! Local IP Address: http://192.168.1.50
   ```

---

### Step 3: Connect from the React Mobile App

1. Open the Smart Home Mobile App.
2. Go to **Settings** -> Toggle **Developer & QA Mode** ON.
3. Under **Device Connection Gateway**:
   - Select **Live ESP32 Board**.
   - Enter your board's IP address (e.g. `192.168.1.50`).
   - Click **Save IP** and tap **Ping Test**.
4. Return to **Dashboard**:
   - Tap **Unlock with Passkey** -> Enter your 4-digit PIN (default: `1234`).
   - Observe the physical servo motor turn to **90°** and the app start the authorization session!

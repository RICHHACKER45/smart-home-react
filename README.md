# 🏡 Smart Home IoT System (React + Ionic + ESP32)

[![Capstone](https://img.shields.io/badge/Capstone_Project-NEUST_CICT-003366?style=flat&logo=school)](https://neust.edu.ph/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Ionic](https://img.shields.io/badge/Ionic-9.0.0-3880FF?logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Vite](https://img.shields.io/badge/Vite-8.0.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP--WROOM--32-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Supabase](https://img.shields.io/badge/Cloud-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

An end-to-end, student-developed production-grade **Smart Home IoT Control Platform** created as a Capstone Project by a student of **Nueva Ecija University of Science and Technology (NEUST - CICT)**. It features a cross-platform **React / Ionic / Android (Capacitor)** application that interfaces directly over local Wi-Fi with an **ESP32 microcontroller**.

Built with offline-first reliability, cryptographic authentication, passkey-protected physical door security, real-time climate telemetry, automated smoke/fire emergency egress failsafes, and optional Supabase cloud synchronization.

---

## 📑 Table of Contents

1. [System Architecture](#-system-architecture)
2. [Key Features &amp; Capabilities](#-key-features--capabilities)
3. [Hardware Specifications &amp; Pinout](#-hardware-specifications--pinout)
4. [Hardware REST API Specification](#-hardware-rest-api-specification)
5. [Project Structure](#-project-structure)
6. [Prerequisites &amp; Environment Variables](#-prerequisites--environment-variables)
7. [Getting Started (Web &amp; Mobile)](#-getting-started-web--mobile)
8. [ESP32 Firmware Flashing Guide](#-esp32-firmware-flashing-guide)
9. [Offline Reliability &amp; Disconnect Failsafes](#-offline-reliability--disconnect-failsafes)
10. [Troubleshooting &amp; Network Diagnostics](#-troubleshooting--network-diagnostics)

---

## 🏛 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│               React 19 + Ionic 9 Mobile & Web Frontend                 │
│      (Capacitor Android Native Shell / Responsive Browser Web)         │
├───────────────────┬───────────────────┬────────────────────────────────┤
│    Dashboard      │      Climate      │    Activity & Audit Logs       │
│  - 3D Door Lock   │  - DHT Telemetry  │  - Glowing Category Tabs       │
│  - Passkey Modal  │  - Recharts Graph │  - Real-time Count Badges      │
│  - Active Session │  - Health Advice  │  - Tamper-evident Trail        │
├───────────────────┴───────────────────┴────────────────────────────────┤
│                  Zustand Global State + dbService Layer                │
│    - SHA-256 Passkey & Password Hashing                                │
│    - Dual Mode Controller (Hardware vs Virtual Simulation)             │
│    - Audio Siren Web Audio API Synthesizer                             │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
            ┌───────────────┴────────────────┐
            │ Local Wi-Fi (LAN) / HTTP JSON  │
            ▼                                ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│  ESP32 Microcontroller Hub    │ │  Cloud Sync Services (Optional)      │
│  (firmware/esp32_smart_home)  │ │  - Supabase PostgreSQL Database      │
│  - WebServer (Port 80)        │ │  - Resend Email API (6-Digit OTP)    │
│  - Full CORS Support          │ └──────────────────────────────────────┘
│  - WiFiManager Captive Portal │
└───────┬───────┬───────┬───────┘
        │       │       │       │
        ▼       ▼       ▼       ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  Servo  │ │  MQ-2   │ │ Active  │ │ DHT11/  │
   │  Door   │ │  Gas/   │ │ Buzzer  │ │  DHT22  │
   │ (GPIO18)│ │ Smoke   │ │ Siren   │ │ Climate │
   │         │ │ (GPIO34)│ │ (GPIO23)│ │ (GPIO4) │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

---

## ✨ Key Features & Capabilities

### 🔐 1. Smart Door Security & Passkey Authentication

* **Passkey Modal with Haptics**: Interactive 4-digit security PIN keypad required before door unlock actions.
* **Authorized Session Timeout**: Configurable session duration (**15m**, **30m**, or **1 hour**) allowing seamless unlocks before automatically expiring and re-locking.
* **Continuous 360° Servo Actuation**: Controls physical door latch with calibrated clockwise (open) and counter-clockwise (close) rotation profiles with anti-jitter detach protection.
* **Hardware Offline Lockout**: If the ESP32 is offline and simulation is inactive, door controls are strictly locked and greyed out to prevent unauthorized state divergence.

### 🌡️ 2. Real-Time Climate Monitoring & Analytics

* **Environmental Telemetry**: Live temperature and humidity streamed from physical DHT11/DHT22 sensors.
* **Interactive Historical Graphs**: 12-tick historical temperature bar chart rendered with Recharts.
* **Dynamic Health Recommendations**: Automated environmental condition assessments (Cool, Ideal, Warm, Critical Heat).

### 🚨 3. Autonomous Emergency Safety Failsafes

* **MQ-2 Smoke & Flammable Gas Detection**: Real-time analog gas threshold detection on ESP32 ADC1.
* **Automatic Emergency Egress Unlock**: When dense smoke or extreme heat ($\ge 40^\circ\text{C}$) is detected, the door automatically swings open to allow emergency evacuation.
* **Dual Siren Alert**: Synchronized hardware buzzer siren on ESP32 alongside an in-browser Web Audio API acoustic alarm synthesizer.

### 🛠️ 4. Developer & QA Testing Suite

* **Gated Developer Mode**: Developer tools hidden behind an explicit toggle with safety disclaimers.
* **Demo Telemetry Simulation Toggle**: Easily toggle between live ESP32 hardware and mock virtual sensor ticks.
* **Telemetry & Hazard Injections**: One-click injection buttons to test Cold ($18^\circ\text{C}$), Normal ($24.5^\circ\text{C}$), Extreme Heat ($38^\circ\text{C}$ / $55^\circ\text{C}$), Smoke Alarms, and Emergency Resets.
* **Real-time Diagnostic Ping**: In-app ESP32 connection probe with comprehensive error alerts and troubleshooting tips.

### 📜 5. High-Visibility Audit & Activity Logs

* **Overhauled High-Contrast Category Tabs**: Glowing, high-contrast tabs (**All**, **Door**, **Climate**, **Emergency**, **Security**, **System**) designed for quick readability.
* **Dynamic Count Badges**: Real-time event counter badges for every log category.
* **Persistent Event History**: Complete audit trail detailing actor username, timestamp, status (`SUCCESS`, `FAILED`, `TRIGGERED`), and action descriptions.

### 👤 6. User Management & OTP Recovery

* **Cryptographic Security**: Passwords and 4-digit door passkeys are cryptographically hashed using SHA-256 with salting.
* **Email OTP Verification**: User registration and password reset protected by 6-digit numeric OTP codes sent via Resend API (with sandbox fallback).

---

## 🔌 Hardware Specifications & Pinout

The firmware runs on standard **ESP32 Development Boards (ESP-WROOM-32)** mounted on an expansion baseboard.

| Component                         | ESP32 GPIO Pin    | Type / Mode        | Description                                                                               |
| :-------------------------------- | :---------------- | :----------------- | :---------------------------------------------------------------------------------------- |
| **360° Continuous Servo**  | **GPIO 18** | Output / PWM       | Door lock mechanism (`write(130)` = Open, `write(60)` = Close, `write(90)` = Stop). |
| **MQ-2 Gas / Smoke Sensor** | **GPIO 34** | Analog In (ADC1)   | Analog AO output for LPG, smoke, and combustible gas monitoring (safe with Wi-Fi).        |
| **Active-Low Buzzer**       | **GPIO 23** | Output (Tri-State) | High-Z floating when silent, low impedance pull-to-GND on alarm for maximum volume.       |
| **DHT11 / DHT22 Sensor**    | **GPIO 4**  | Digital I/O        | Temperature & humidity environmental telemetry.                                           |
| **Onboard Blue LED**        | **GPIO 2**  | Digital Output     | Network status and alarm heartbeat indicator.                                             |

> ⚠️ **Continuous 360° Servo Calibration Note**:
> Continuous rotation servos treat position angles as speed commands:
>
> * `90` = Stop / Neutral Brake
> * `130` = Controlled Clockwise Spin (Push Door Open)
> * `60` = Controlled Counter-Clockwise Spin (Pull Door Closed)
>   The firmware rotates for `320ms` and immediately commands `detach()` to eliminate gear hum and motor heating.

---

## 📡 Hardware REST API Specification

The ESP32 web server serves CORS-enabled JSON endpoints on standard HTTP port `80`.

### 1. Status Telemetry

```http
GET /api/status (also supports /status and /)
Accept: application/json
```

**Response (200 OK):**

```json
{
  "deviceId": "ESP32-SmartHome-01",
  "macAddress": "24:6F:28:AB:CD:EF",
  "ipAddress": "192.168.1.50",
  "isLocked": true,
  "temperature": 25.4,
  "humidity": 52.0,
  "smokeActive": false,
  "isAlarming": false,
  "signalStrength": 94,
  "uptimeSeconds": 1420,
  "gasValue": 340,
  "gasThreshold": 1800,
  "tempLimit": 40.0,
  "muted": false,
  "mode": "wifi"
}
```

### 2. Door Control

```http
POST /api/door
Content-Type: application/json

{"action": "unlock"}  // Options: "lock", "unlock"
```

**Response (200 OK):**

```json
{
  "success": true,
  "isLocked": false,
  "message": "Door Opened (90° CW)"
}
```

### 3. Emergency Alarm Reset

```http
POST /api/reset-alarm
Content-Type: application/json
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Alarm reset successfully"
}
```

---

## 📂 Project Structure

```
smart-home-react/
├── android/                        # Capacitor Android native project & Gradle build
├── assets/                         # Application logos, splash screen assets & icons
├── firmware/                       # ESP32 C++ Arduino firmware
│   └── esp32_smart_home.ino        # Full microcontroller firmware with WebServer & sensors
├── public/                         # Public static web assets
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── PasskeyModal.tsx        # 4-Digit PIN entry security modal
│   │   └── PasskeyModal.css
│   ├── hooks/                      # Custom React hooks
│   │   └── useSiren.ts             # Web Audio API emergency siren synthesizer
│   ├── pages/                      # Main application view pages
│   │   ├── Activity.tsx            # Audit & Activity logs with glowing tabs
│   │   ├── Activity.css
│   │   ├── Climate.tsx             # Climate telemetry & Recharts graphs
│   │   ├── Dashboard.tsx           # 3D Door control & home dashboard
│   │   ├── Dashboard.css
│   │   ├── Login.tsx               # Glassmorphism auth with OTP verification
│   │   ├── Login.css
│   │   └── Settings.tsx            # Profiles, door PIN, developer & ESP32 gateway
│   ├── services/                   # Service integrations & database
│   │   ├── dbService.ts            # Local relational DB with cloud sync
│   │   ├── emailService.ts         # Resend & EmailJS OTP delivery service
│   │   ├── hardwareService.ts      # ESP32 REST API client & ping diagnostic tool
│   │   └── supabaseClient.ts       # Supabase Cloud Postgres client
│   ├── store/                      # Global state management
│   │   └── useStore.ts             # Zustand central store & safety rules engine
│   ├── theme/                      # Styling tokens & Ionic theme variables
│   │   └── variables.css           # Glassmorphism dark mode design system
│   ├── types/                      # TypeScript database and entity contracts
│   │   └── database.ts
│   ├── utils/                      # Helper utilities
│   │   └── crypto.ts               # Web Crypto API SHA-256 hash implementation
│   ├── App.tsx                     # Main router & global polling daemon
│   └── main.tsx                    # Application entry point
├── capacitor.config.ts             # Capacitor native mobile bridge configuration
├── ESP32_INTEGRATION_GUIDE.md      # Detailed hardware wiring & communication guide
├── IMPLEMENTATION.md               # End-to-end architectural plan & milestones
├── package.json                    # Project metadata & npm dependencies
├── schema.sql                      # Supabase PostgreSQL production DDL schema
└── vite.config.ts                  # Vite build tool configuration
```

---

## ⚙️ Prerequisites & Environment Variables

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **Package Manager**: `npm` or `pnpm`
* **Arduino IDE** (or PlatformIO) with **ESP32 Board Package (v2.0+)**
* **Android Studio** (Optional, only needed for compiling APK / physical Android runs)

### Environment Variables (`.env`)

Create a `.env` file in the project root:

```env
# Supabase Cloud Synchronization (Optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Transactional Email Verification (Resend API)
VITE_RESEND_API_KEY=re_your_resend_api_key_here
VITE_RESEND_FROM_EMAIL=onboarding@resend.dev

# EmailJS Fallback (Optional)
VITE_EMAILJS_SERVICE_ID=service_your_service_id
VITE_EMAILJS_TEMPLATE_ID=template_your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

---

## 🚀 Getting Started (Web & Mobile)

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Run Local Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build Web Bundle

```bash
npm run build
```

### 4. Sync & Launch on Android (Capacitor)

```bash
# Sync web build to the Android native directory
npx cap sync android

# Open project in Android Studio to deploy to your physical phone or emulator
npx cap open android
```

---

## 🔌 ESP32 Firmware Flashing Guide

1. Open **Arduino IDE**.
2. Navigate to **File $\rightarrow$ Open** and select `firmware/esp32_smart_home.ino`.
3. Install required libraries via **Sketch $\rightarrow$ Include Library $\rightarrow$ Manage Libraries**:
   * `WiFiManager` by tzapu
   * `DHT sensor library` by Adafruit
   * `ESP32Servo` by Kevin Harrington
4. Under **Tools $\rightarrow$ Board**, select **ESP32 Dev Module**.
5. Connect your ESP32 board via USB, choose the correct COM port, and click **Upload**.
6. **Connect ESP32 to Wi-Fi**:
   * On first boot, the ESP32 broadcasts a hotspot named **`SmartHome-Setup`**.
   * Connect your phone to `SmartHome-Setup` and browse to `192.168.4.1` to enter your home Wi-Fi credentials.
   * Open the Arduino Serial Monitor at `115200 baud` to note the assigned local IP (e.g., `192.168.1.50`).

---

## 🛡️ Offline Reliability & Disconnect Failsafes

This system enforces strict safety boundaries between virtual testing and real-world hardware:

1. **Hardware Kill-Switch**: If the ESP32 loses power or disconnects from Wi-Fi, the app avoids reporting stale or simulated telemetry. All metrics fall to `0` and a visible `NO HARDWARE DETECTED` banner appears.
2. **Door Lockout**: The front door cannot be toggled when offline, protecting physical door security.
3. **Registry Isolation**: No phantom or mock starter devices are populated until real hardware is discovered or Demo Simulation is explicitly turned on.
4. **Developer Mode Gating**: Demo Telemetry Simulation can only be toggled when **Developer & QA Mode** is active. Disabling Developer Mode automatically shuts off simulation and restores hardware-only enforcement.

---

## 🔍 Troubleshooting & Network Diagnostics

| Problem                                              | Root Cause                         | Solution                                                                                                                                                                    |
| :--------------------------------------------------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Could not connect to http://192.168.1.50"** | Devices on different Wi-Fi subnets | Ensure your phone/PC and the ESP32 are connected to the exact same 2.4GHz Wi-Fi network.                                                                                    |
| **Ping Test fails on HTTPS deployment**        | Browser Mixed Content restriction  | Web browsers block plain`http://` local IP calls from `https://` websites. Test using `http://localhost:5173` or deploy as an Android APK via Capacitor.              |
| **Door servo hums or gets warm**               | Continuous power draw              | The firmware auto-detaches PWM`800ms` after each turn. If using custom angles, ensure `doorServo.detach()` is called.                                                   |
| **Buzzer makes high-pitched hum when idle**    | Floating active-low pin            | The buzzer uses high-Z floating mode on GPIO 23 (`pinMode(BUZZER_PIN, INPUT)`). Ensure the ground wire is shared with the ESP32 GND.                                      |
| **OTP verification email not arriving**        | Resend sandbox restriction         | On free Resend tiers, emails can only be sent to the account owner's email address or requires domain verification. The app logs sandbox OTPs directly to DevTools console. |

---

## 📄 License

This project is proprietary and developed by a student of NEUST CICT for capstone project and serves no affiliation with any company or sort for smart home automation and testing. All rights reserved.

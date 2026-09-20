# Smart Home End-to-End Implementation Plan (Revised)

This comprehensive implementation plan unites the **Database Architecture**, **Security & Passkey Verification**, and the **ESP32 Device-Ready Hardware Gateway** for the Smart Home React / Capacitor Android system.

---

## 1. System Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │            Ionic + React + Capacitor Mobile App        │
 ├────────────────────────────────────────────────────────┤
 │ [ Dashboard ]   [ Climate ]   [ Activity ]  [ Settings ]
 ├────────────────────────────────────────────────────────┤
 │   Passkey PIN   │ Category    │ Dual Mode   │ Account  │
 │   Security Modal│ Log Filters │ Simulation  │ Profile  │
 │                 │             │ vs Live ESP │ Mgmt     │
 ├────────────────────────────────────────────────────────┤
 │            Zustand Store + dbService Layer             │
 └───────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌───────────────────────┐       ┌────────────────────────┐
│  Local Database Layer │       │  ESP32 Hardware Bridge │
│  (IndexedDB / SQLite) │       │  (REST API / Local IP) │
│  - accounts           │       │  - /api/status         │
│  - devices            │       │  - /api/door           │
│  - sensor_readings    │       │  - /api/reset-alarm    │
│  - daily_summaries    │       │  (Falls back to Mock   │
│  - activity_logs      │       │   when offline)        │
│  - emergency_alerts   │       └────────────────────────┘
└───────────────────────┘
```

---

## 2. Phased Execution Roadmap

### 📦 Phase 1: Database & Persistence Layer
- **Goal**: Implement persistent local relational storage so accounts, devices, readings, and activity logs survive app restarts on phone.
- **Files**:
  - `src/types/database.ts` (Done ✅)
  - `src/services/dbService.ts`: Local repository with persistent storage, password hashing simulation, passkey verification, and initial seed data (Default Account: `admin` / passkey `1234`, Linked Devices: Front Door Lock, Climate Sensor).

### 🔐 Phase 2: Security & Door Passkey Modal
- **Goal**: Protect physical door controls by requiring a 4-digit PIN / Passkey before locking/unlocking.
- **Files**:
  - `src/components/PasskeyModal.tsx`: Modern PIN keypad overlay with haptics, error shaking animation, and masked dots.
  - `src/pages/Dashboard.tsx`: Trigger `PasskeyModal` on door interaction $\rightarrow$ on success, execute door toggle and log `DOOR_UNLOCKED` activity.

### 📡 Phase 3: ESP32 Hardware Integration & Settings
- **Goal**: Allow the app to toggle between **Demo Simulation** and **Live ESP32 Hardware**.
- **Files**:
  - `src/services/hardwareService.ts` (Done ✅)
  - `src/pages/Settings.tsx`: Add Hardware Connection panel with ESP32 IP input, "Test Ping / Connect" button, and Mode switcher (Simulation vs Live ESP32).

### 📊 Phase 4: Activity Filter & Enhanced Climate Analytics
- **Goal**: Upgrade Activity page with categorized event filters and persist environmental summaries.
- **Files**:
  - `src/pages/Activity.tsx`: Segmented filter buttons (`ALL`, `DOOR`, `CLIMATE`, `EMERGENCY`, `AUTH`).
  - `src/store/useStore.ts`: Bind store actions directly to `dbService` and `hardwareService`.

### 📱 Phase 5: Verification & Android Capacitor Sync
- **Goal**: Compile TypeScript, build web assets, and sync to Android project for testing on physical phone.
- **Commands**:
  - `pnpm exec tsc --noEmit`
  - `pnpm run build`
  - `pnpm exec cap sync android`

---

## 3. Database DDL Reference

```sql
-- 1. ACCOUNTS & PASSKEY
CREATE TABLE accounts (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    door_passkey_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEVICES (Non-deletable)
CREATE TABLE devices (
    id VARCHAR(36) PRIMARY KEY,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(30) NOT NULL,
    room_location VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    status VARCHAR(20) DEFAULT 'active',
    signal_strength INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SENSOR READINGS
CREATE TABLE sensor_readings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(36) NOT NULL,
    temperature DECIMAL(4, 1) NOT NULL,
    humidity DECIMAL(4, 1) NULL,
    smoke_detected BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- 4. ACTIVITY AUDIT LOGS
CREATE TABLE activity_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(36) NULL,
    device_id VARCHAR(36) NULL,
    event_category VARCHAR(20) NOT NULL,
    action_description VARCHAR(255) NOT NULL,
    status_result VARCHAR(20) DEFAULT 'SUCCESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. EMERGENCY ALERTS
CREATE TABLE emergency_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id VARCHAR(36) NOT NULL,
    alert_type VARCHAR(30) NOT NULL,
    auto_unlock_executed BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'TRIGGERED',
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Verification & Testing Checklist

- [ ] **Passkey Security**: Door unlocking prompts for PIN `1234`. Wrong PIN prevents unlocking and logs a security failure.
- [ ] **Dual-Mode Switch**: In Settings, toggling between Simulation and Live Hardware works without app crash.
- [ ] **Emergency Failsafe**: Simulating smoke triggers auto-unlock, siren, and records an Emergency Alert.
- [ ] **Persistent Storage**: Reloading the app retains previous activity logs and settings.
- [ ] **Android Build**: `pnpm run build` succeeds and updates `android/` assets.

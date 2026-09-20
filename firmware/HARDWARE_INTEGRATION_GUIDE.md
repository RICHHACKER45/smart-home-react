# ESP32 Smart Home Hardware Integration & Wiring Guide

This guide provides the exact wiring, pinouts, and setup instructions so that once the physical ESP32 and Arduino components are acquired, they will connect to the mobile app seamlessly without changing app code.

---

## 🔌 1. Required Hardware Components & Pinout

| Component | ESP32 GPIO Pin | Function | Description |
| :--- | :--- | :--- | :--- |
| **DHT11 / DHT22** | `GPIO 4` | Temperature & Humidity Sensor | Measures climate data every 3 seconds |
| **MQ-2 / MQ-135** | `GPIO 34` (Analog A0) | Smoke & Gas Detector | Detects flammable gases, smoke levels |
| **Servo Motor (SG90 / MG996R)** | `GPIO 18` (PWM) | Smart Door Lock Actuator | 0° = Locked, 90° = Unlocked |
| **Active Buzzer (5V)** | `GPIO 19` | Emergency Siren | Sounds alarm during smoke / extreme heat ($\ge 45^\circ\text{C}$) |
| **Status LED** | `GPIO 2` (Onboard LED) | Device & Lock Indicator | Visual status feedback |

---

## ⚡ 2. Wiring Diagram

```
                 +-----------------------+
                 |    ESP32 DevKit V1    |
                 |                       |
   [3.3V / 5V] --| VIN / 3V3             |
   [GND] --------| GND                   |
                 |                       |
   [DHT22 Data] -| GPIO 4                |
   [MQ-2 Analog]-| GPIO 34 (A6)          |
   [Servo Signal]| GPIO 18               |
   [Buzzer (+)] -| GPIO 19               |
                 +-----------------------+
```

---

## 🛠️ 3. How to Flash the ESP32 Firmware

1. Install the **Arduino IDE** (or PlatformIO in VS Code).
2. Install the **ESP32 Board Manager**:
   - URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Install the required Arduino libraries via Library Manager:
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - `ESP32Servo` by Kevin Harrington
   - `ArduinoJson` by Benoit Blanchon (Version 6.x)
4. Open [**`firmware/esp32_smart_home.ino`**](file:///c:/Users/RichkillDev45/Desktop/smart-home-react/firmware/esp32_smart_home.ino).
5. Update your Wi-Fi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
6. Select Board **"DOIT ESP32 DEVKIT V1"** and COM Port, then click **Upload**.
7. Open the Serial Monitor at **115200 baud**. Note the printed IP Address (e.g., `192.168.1.50`).

---

## 📲 4. Connecting the Phone App to the ESP32

1. Open the Smart Home App on your phone (make sure phone is on the same Wi-Fi).
2. Go to the **Settings** tab.
3. Switch Mode from **"Simulation"** to **"Live ESP32 Hardware"**.
4. Enter the ESP32 IP Address (`192.168.1.XX`).
5. Tap **"Test Connection"**.
6. The app will immediately start displaying live sensor readings from the DHT22 and MQ-2, and tapping "Unlock Door" with your passkey will physically turn the servo motor!

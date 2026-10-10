/**
 * Hardware Integration Service for ESP32 & Sensors
 * 
 * Provides a unified interface to communicate with the physical ESP32 microcontroller
 * or fallback smoothly to the simulation engine when physical hardware is offline.
 */

export interface ESP32Telemetry {
  deviceId: string;
  macAddress: string;
  ipAddress: string;
  isLocked: boolean;
  temperature: number;
  humidity: number;
  smokeActive: boolean;
  isAlarming: boolean;
  signalStrength: number;
  uptimeSeconds: number;
  gasValue?: number;
  gasThreshold?: number;
  tempLimit?: number;
  muted?: boolean;
}

export interface HardwareConfig {
  mode: 'simulation' | 'hardware';
  esp32Ip: string; // e.g. "192.168.1.50"
  timeoutMs: number;
}

const STORAGE_KEY = 'smart_home_hardware_config';

export const getHardwareConfig = (): HardwareConfig => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        mode: parsed.mode || 'hardware',
        esp32Ip: parsed.esp32Ip || '192.168.1.50',
        timeoutMs: parsed.timeoutMs || 3000
      };
    } catch (e) {}
  }
  return {
    mode: 'hardware',
    esp32Ip: '192.168.1.50',
    timeoutMs: 3000
  };
};

export const saveHardwareConfig = (config: HardwareConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('[HardwareService] Error saving config:', e);
  }
};

export const cleanIp = (ip: string): string => {
  return ip.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
};

/**
 * Poll live status from the ESP32 hardware with endpoint fallbacks
 */
export const fetchESP32Status = async (ipAddress: string): Promise<ESP32Telemetry | null> => {
  const host = cleanIp(ipAddress);
  if (!host) return null;

  const endpoints = [`http://${host}/api/status`, `http://${host}/status`, `http://${host}/`];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(id);

      if (response.ok) {
        const text = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          // If response was HTML or non-JSON, continue to next endpoint
          continue;
        }

        // Map unified and legacy firmware field aliases
        const isLocked = data.isLocked !== undefined 
          ? Boolean(data.isLocked) 
          : (data.servoOpen !== undefined ? !data.servoOpen : true);

        const temperature = data.temperature !== undefined 
          ? Number(data.temperature) 
          : (data.temp !== undefined ? Number(data.temp) : 24.5);

        const humidity = data.humidity !== undefined 
          ? Number(data.humidity) 
          : (data.hum !== undefined ? Number(data.hum) : 50.0);

        const smokeActive = data.smokeActive !== undefined 
          ? Boolean(data.smokeActive) 
          : Boolean(data.gasAlarm);

        const isAlarming = data.isAlarming !== undefined 
          ? Boolean(data.isAlarming) 
          : (data.alarm !== undefined ? Boolean(data.alarm) : (smokeActive || temperature >= 40.0));

        return {
          deviceId: data.deviceId || 'ESP32-SmartHome',
          macAddress: data.macAddress || 'ESP32-WIFI-MAC',
          ipAddress: host,
          isLocked,
          temperature,
          humidity,
          smokeActive,
          isAlarming,
          signalStrength: data.signalStrength !== undefined ? Number(data.signalStrength) : 92,
          uptimeSeconds: data.uptimeSeconds !== undefined ? Number(data.uptimeSeconds) : 0,
          gasValue: data.gasValue !== undefined ? Number(data.gasValue) : (data.gas !== undefined ? Number(data.gas) : 0),
          gasThreshold: data.gasThreshold !== undefined ? Number(data.gasThreshold) : 1800,
          tempLimit: data.tempLimit !== undefined ? Number(data.tempLimit) : 40.0,
          muted: Boolean(data.muted)
        };
      }
    } catch (error) {
      // Continue to next endpoint if this one threw network error
      continue;
    }
  }

  return null;
};

/**
 * Direct probe for ping diagnostic test with detailed error reporting
 */
export const probeESP32 = async (ipAddress: string): Promise<{ success: boolean; data?: ESP32Telemetry; error?: string }> => {
  const host = cleanIp(ipAddress);
  if (!host) {
    return { success: false, error: 'Please enter a valid IP address (e.g. 192.168.1.50).' };
  }

  try {
    const telemetry = await fetchESP32Status(host);
    if (telemetry) {
      return { success: true, data: telemetry };
    }
    return { 
      success: false, 
      error: `Could not reach ESP32 at http://${host}/api/status. Verify device is connected to the same Wi-Fi and powered on.` 
    };
  } catch (err: any) {
    return { 
      success: false, 
      error: err?.message || 'Network request failed. Ensure PC/phone is connected to the same local network.' 
    };
  }
};

/**
 * Send door lock/unlock command to physical ESP32
 */
export const sendESP32DoorCommand = async (
  ipAddress: string, 
  action: 'lock' | 'unlock'
): Promise<{ success: boolean; isLocked?: boolean; message?: string }> => {
  const host = cleanIp(ipAddress);
  if (!host) return { success: false, message: 'Invalid IP address' };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`http://${host}/api/door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
      signal: controller.signal
    });

    clearTimeout(id);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { 
        success: true, 
        isLocked: action === 'lock', 
        message: data.message || `Door ${action}ed successfully` 
      };
    }

    return { success: false, message: `ESP32 returned HTTP ${response.status}` };
  } catch (error: any) {
    console.error('[HardwareService] Error sending door command:', error);
    return { success: false, message: error?.message || 'Network communication error' };
  }
};

/**
 * Reset alarm on the physical ESP32
 */
export const resetESP32Alarm = async (ipAddress: string): Promise<boolean> => {
  const host = cleanIp(ipAddress);
  if (!host) return false;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`http://${host}/api/reset-alarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(id);
    return response.ok;
  } catch (error) {
    console.error('[HardwareService] Error resetting ESP32 alarm:', error);
    return false;
  }
};

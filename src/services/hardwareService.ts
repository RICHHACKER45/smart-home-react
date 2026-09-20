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
      return JSON.parse(saved);
    } catch (e) {}
  }
  return {
    mode: 'simulation',
    esp32Ip: '192.168.1.100',
    timeoutMs: 3000
  };
};

export const saveHardwareConfig = (config: HardwareConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

/**
 * Poll live status from the ESP32 hardware
 */
export const fetchESP32Status = async (ipAddress: string): Promise<ESP32Telemetry | null> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${ipAddress}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn(`[HardwareService] Failed to reach ESP32 at ${ipAddress}:`, error);
    return null;
  }
};

/**
 * Send door lock/unlock command to physical ESP32
 */
export const sendESP32DoorCommand = async (
  ipAddress: string, 
  action: 'lock' | 'unlock'
): Promise<{ success: boolean; isLocked?: boolean; message?: string }> => {
  try {
    const response = await fetch(`http://${ipAddress}/api/door`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    return await response.json();
  } catch (error: any) {
    console.error('[HardwareService] Error sending door command:', error);
    return { success: false, message: error?.message || 'Network error' };
  }
};

/**
 * Reset alarm on the physical ESP32
 */
export const resetESP32Alarm = async (ipAddress: string): Promise<boolean> => {
  try {
    const response = await fetch(`http://${ipAddress}/api/reset-alarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } catch (error) {
    console.error('[HardwareService] Error resetting ESP32 alarm:', error);
    return false;
  }
};

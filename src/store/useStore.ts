import { create } from 'zustand';
import { dbService } from '../services/dbService';
import { 
  getHardwareConfig, 
  saveHardwareConfig,
  fetchESP32Status, 
  sendESP32DoorCommand, 
  resetESP32Alarm,
  HardwareConfig 
} from '../services/hardwareService';
import { Account, Device, ActivityLog, EmergencyAlert } from '../types/database';

export interface SmartHomeState {
  isAuthenticated: boolean;
  currentUser: Account | null;
  isLocked: boolean;
  isDoorAuthorized: boolean;
  doorAuthExpiresAt: number | null;
  doorSessionDurationMinutes: number;
  isDeveloperMode: boolean;
  temperature: number;
  humidity: number;
  gasValue: number;
  gasThreshold: number;
  latencyMs: number;
  signalStrength: number;
  networkHealth: number;
  isAlarming: boolean;
  smokeActive: boolean;
  temperatureHistory: number[];
  devices: Device[];
  logs: ActivityLog[];
  alerts: EmergencyAlert[];
  simulationActive: boolean;
  hardwareConfig: HardwareConfig;
  hardwareConnected: boolean;
  isPasskeyModalOpen: boolean;

  // Authentication Actions
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  requestOtp: (email: string, username: string) => Promise<{ success: boolean; message?: string; otp?: string }>;
  verifyOtp: (email: string, code: string) => { success: boolean; message?: string };
  register: (params: { username: string; email: string; password: string; doorPasskey?: string }) => Promise<{ success: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPasswordWithOtp: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;

  // Primary Actions
  openPasskeyModal: () => void;
  closePasskeyModal: () => void;
  executeAuthenticatedDoorToggle: () => Promise<void>;
  toggleLock: () => Promise<void>;
  setDoorSessionDurationMinutes: (mins: number) => void;
  revokeDoorAuthorization: () => void;
  toggleDeveloperMode: (enable?: boolean) => void;
  increaseTemp: (amount: number) => void;
  setExactTemperature: (temp: number) => void;
  setExactHumidity: (hum: number) => void;
  simulateElevatedHumidity: (hum?: number) => void;
  simulateSmoke: () => void;
  simulateExtremeHeat: () => void;
  resetSystem: () => void;
  addLog: (text: string, category?: ActivityLog['eventCategory']) => void;
  toggleSimulation: () => void;
  runSimulationTick: () => void;
  pollDevices: () => Promise<void>;

  // Hardware Configuration & Testing Helpers
  updateHardwareConfig: (config: Partial<HardwareConfig>) => void;
  clearDatabaseLogs: () => void;
  refreshFromDatabase: () => void;
}

export const useStore = create<SmartHomeState>((set, get) => {
  const checkSafetyRules = (state: Partial<SmartHomeState>) => {
    const current = get();
    const temp = state.temperature ?? current.temperature;
    const gasVal = state.gasValue !== undefined ? state.gasValue : (current.gasValue || 0);
    const gasThresh = state.gasThreshold !== undefined ? state.gasThreshold : (current.gasThreshold || 1800);
    // Check if hazard is detected by real-time hardware telemetry or sensors
    const isGasOrSmoke = (state.smokeActive ?? current.smokeActive) || (gasVal >= gasThresh && gasVal > 0);
    const isHeat = temp >= 40;
    const isHardwareAlarm = Boolean(state.isAlarming);
    const hazardDetected = isGasOrSmoke || isHeat || isHardwareAlarm;

    const wasAlarming = current.isAlarming;
    let isAlarming = state.isAlarming !== undefined ? state.isAlarming : current.isAlarming;
    let isLocked = state.isLocked ?? current.isLocked;

    // Real-time detector trigger: record incident and engage safety egress
    if (hazardDetected) {
      isAlarming = true;
      isLocked = false; // Auto-unlock door for safe emergency egress

      // If system was not already alarming, capture real-time detector data
      if (!wasAlarming) {
        let reason = '';
        let alertType: 'SMOKE_DETECTED' | 'CRITICAL_HEAT' | 'MANUAL_PANIC' = 'SMOKE_DETECTED';

        if (isGasOrSmoke) {
          alertType = 'SMOKE_DETECTED';
          reason = gasVal > 0 
            ? `Smoke/Gas Spike: ${gasVal} ADC (Limit: ${gasThresh} ADC)` 
            : 'Dense Smoke / Combustible Gas Detected';
        } else if (isHeat) {
          alertType = 'CRITICAL_HEAT';
          reason = `Critical Ambient Heat: ${temp}°C (Limit: 40.0°C)`;
        } else {
          alertType = 'MANUAL_PANIC';
          reason = 'Real-time Hardware Emergency Siren Triggered';
        }

        dbService.createAlert(alertType, reason);
      }
    }

    // Environmental climate threshold logging (clumped via dbService 45s filter to prevent bloat)
    const hum = state.humidity !== undefined ? state.humidity : current.humidity;
    if (hum >= 60) {
      dbService.logActivity('Climate Sensor', 'CLIMATE', `⚠️ High Humidity Warning: ${hum}% RH (Ventilation Recommended)`, 'TRIGGERED');
    } else if (temp >= 35 && temp < 40) {
      dbService.logActivity('Climate Sensor', 'CLIMATE', `🌡️ High Ambient Temperature: ${temp}°C`, 'TRIGGERED');
    }

    // Explicitly add or remove the emergency class based on final state
    if (isAlarming) {
      document.body.classList.add('emergency-mode');
    } else {
      document.body.classList.remove('emergency-mode');
    }

    return { 
      ...state, 
      isAlarming, 
      isLocked,
      smokeActive: isGasOrSmoke,
      logs: dbService.getActivityLogs(),
      alerts: dbService.getAlerts()
    };
  };

  const initialSession = dbService.getCurrentSession();

  return {
    isAuthenticated: initialSession !== null,
    currentUser: initialSession,
    isLocked: true,
    isDoorAuthorized: false,
    doorAuthExpiresAt: null,
    doorSessionDurationMinutes: parseInt(localStorage.getItem('smart_home_door_duration') || '30', 10),
    isDeveloperMode: localStorage.getItem('smart_home_dev_mode') === 'true',
    temperature: 0,
    humidity: 0,
    gasValue: 0,
    gasThreshold: 1800,
    latencyMs: 0,
    signalStrength: 0,
    networkHealth: 0,
    isAlarming: false,
    smokeActive: false,
    temperatureHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    devices: dbService.getDevices(initialSession?.id),
    logs: dbService.getActivityLogs(),
    alerts: dbService.getAlerts(),
    simulationActive: false,
    hardwareConfig: getHardwareConfig(),
    hardwareConnected: false,
    isPasskeyModalOpen: false,

    // Authentication
    login: async (identifier, password) => {
      const res = await dbService.authenticate(identifier, password);
      if (res.success && res.account) {
        set({
          isAuthenticated: true,
          currentUser: res.account,
          devices: dbService.getDevices(res.account.id),
          logs: dbService.getActivityLogs()
        });
        return { success: true };
      }
      return { success: false, message: res.message || 'Invalid credentials' };
    },

    requestOtp: async (email, username) => {
      return await dbService.requestSignupOtp(email, username);
    },

    verifyOtp: (email, code) => {
      return dbService.verifySignupOtp(email, code);
    },

    requestPasswordReset: async (email) => {
      return await dbService.sendPasswordResetOtp(email);
    },

    resetPasswordWithOtp: async (email, otp, newPassword) => {
      return await dbService.resetPasswordWithOtp(email, otp, newPassword);
    },

    register: async (params) => {
      const res = await dbService.register(params);
      if (res.success && res.account) {
        set({
          isAuthenticated: true,
          currentUser: res.account,
          devices: dbService.getDevices(res.account.id),
          logs: dbService.getActivityLogs()
        });
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    },

    logout: () => {
      dbService.logout();
      set({
        isAuthenticated: false,
        currentUser: null,
        isDoorAuthorized: false,
        doorAuthExpiresAt: null,
        devices: dbService.getDevices(),
        logs: dbService.getActivityLogs()
      });
    },

    setDoorSessionDurationMinutes: (mins: number) => {
      localStorage.setItem('smart_home_door_duration', mins.toString());
      set({ doorSessionDurationMinutes: mins });
    },

    revokeDoorAuthorization: () => {
      set({ isDoorAuthorized: false, doorAuthExpiresAt: null });
    },

    toggleDeveloperMode: (enable?: boolean) => {
      const next = enable !== undefined ? enable : !get().isDeveloperMode;
      localStorage.setItem('smart_home_dev_mode', next.toString());
      if (!next) {
        set({ 
          isDeveloperMode: false,
          simulationActive: false,
          temperature: 0,
          humidity: 0,
          signalStrength: 0,
          networkHealth: 0,
          latencyMs: 0,
          hardwareConnected: false,
          temperatureHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        });
      } else {
        set({ isDeveloperMode: true });
      }
    },

    openPasskeyModal: () => set({ isPasskeyModalOpen: true }),
    closePasskeyModal: () => set({ isPasskeyModalOpen: false }),

    executeAuthenticatedDoorToggle: async () => {
      const state = get();
      if (state.isAlarming) return;

      const newLocked = !state.isLocked;
      const durationMs = (state.doorSessionDurationMinutes || 30) * 60 * 1000;
      const newExpiry = Date.now() + durationMs;

      // If live hardware is configured, send command to ESP32
      if (state.hardwareConfig.mode === 'hardware') {
        const res = await sendESP32DoorCommand(state.hardwareConfig.esp32Ip, newLocked ? 'lock' : 'unlock');
        if (!res.success) {
          dbService.logActivity('Hardware Error', 'DOOR', `ESP32 door control failed: ${res.message}`, 'FAILED');
        }
      }

      const actor = state.currentUser ? state.currentUser.username : 'User';
      dbService.logActivity(
        actor, 
        'DOOR', 
        `Door ${newLocked ? 'Locked' : 'Unlocked'} with Passkey (${state.doorSessionDurationMinutes}m session authorized)`, 
        'SUCCESS'
      );

      set(checkSafetyRules({
        isLocked: newLocked,
        isDoorAuthorized: true,
        doorAuthExpiresAt: newExpiry,
        isPasskeyModalOpen: false
      }));
    },

    toggleLock: async () => {
      const state = get();
      if (state.isAlarming) return;

      // 1. If door is currently UNLOCKED and user wants to LOCK:
      if (!state.isLocked) {
        // Direct lock permitted
        if (state.hardwareConfig.mode === 'hardware') {
          await sendESP32DoorCommand(state.hardwareConfig.esp32Ip, 'lock');
        }
        const actor = state.currentUser ? state.currentUser.username : 'User';
        dbService.logActivity(actor, 'DOOR', 'Door manually locked', 'SUCCESS');
        set(checkSafetyRules({ isLocked: true }));
        return;
      }

      // 2. If door is currently LOCKED and user wants to UNLOCK:
      const isSessionActive = state.isDoorAuthorized && state.doorAuthExpiresAt && Date.now() < state.doorAuthExpiresAt;

      if (isSessionActive) {
        // Session is still authorized: direct unlock without asking for PIN again
        if (state.hardwareConfig.mode === 'hardware') {
          await sendESP32DoorCommand(state.hardwareConfig.esp32Ip, 'unlock');
        }
        const actor = state.currentUser ? state.currentUser.username : 'User';
        dbService.logActivity(actor, 'DOOR', 'Door unlocked (Active Passkey Session)', 'SUCCESS');
        set(checkSafetyRules({ isLocked: false }));
      } else {
        // Authorization expired or inactive: prompt for 4-digit security PIN
        set({ isDoorAuthorized: false, doorAuthExpiresAt: null, isPasskeyModalOpen: true });
      }
    },

    increaseTemp: (amount) => set((state) => {
      const newTemp = Number((state.temperature + amount).toFixed(1));
      dbService.logActivity('Tester', 'CLIMATE', `Manual temp change (+${amount}°C) to ${newTemp}°C`);
      return checkSafetyRules({
        temperature: newTemp
      });
    }),

    setExactTemperature: (temp) => set(() => {
      const formatted = Number(temp.toFixed(1));
      dbService.logActivity('Tester', 'CLIMATE', `Injected exact temperature: ${formatted}°C`);
      return checkSafetyRules({
        temperature: formatted
      });
    }),

    setExactHumidity: (hum) => set(() => {
      const formatted = Math.max(0, Math.min(100, Math.round(hum)));
      dbService.logActivity('Tester', 'CLIMATE', `Injected exact humidity: ${formatted}%`);
      return { humidity: formatted };
    }),

    simulateElevatedHumidity: (hum = 68) => set(() => {
      dbService.logActivity('Tester', 'CLIMATE', `Simulated elevated humidity warning injected (${hum}%)`);
      return { humidity: hum };
    }),

    simulateSmoke: () => set(() => {
      return checkSafetyRules({
        smokeActive: true,
        gasValue: 2650,
        gasThreshold: 1800
      });
    }),

    simulateExtremeHeat: () => set(() => {
      return checkSafetyRules({
        temperature: 55.0
      });
    }),

    resetSystem: () => {
      document.body.classList.remove('emergency-mode');
      const state = get();
      if (state.hardwareConfig.mode === 'hardware') {
        resetESP32Alarm(state.hardwareConfig.esp32Ip);
      }
      dbService.resolveAllAlerts();
      const actor = state.currentUser?.username || 'System';
      dbService.logActivity(actor, 'EMERGENCY', '🚨 Emergency Cleared: System restored to normal and alarm silenced', 'SUCCESS');
      dbService.logActivity(actor, 'SYSTEM', 'System emergency reset executed to normal state', 'SUCCESS');
      set((s) => ({
        isLocked: true,
        temperature: 24.8,
        humidity: 47,
        gasValue: 320,
        gasThreshold: 1800,
        latencyMs: 12,
        signalStrength: 98,
        networkHealth: 96,
        isAlarming: false,
        smokeActive: false,
        temperatureHistory: Array(12).fill(24.8),
        logs: dbService.getActivityLogs(),
        alerts: dbService.getAlerts()
      }));
    },

    addLog: (text, category = 'SYSTEM') => {
      const state = get();
      const actor = state.currentUser?.username || 'App User';
      dbService.logActivity(actor, category, text);
      set({ logs: dbService.getActivityLogs() });
    },

    toggleSimulation: () => set((state) => {
      const next = !state.simulationActive;
      const actor = state.currentUser?.username || 'System';
      dbService.logActivity(actor, 'SYSTEM', `Data Simulation ${next ? 'Enabled' : 'Disabled'}`);
      
      if (next) {
        return {
          simulationActive: true,
          temperature: state.temperature === 0 ? 24.5 : state.temperature,
          humidity: state.humidity === 0 ? 48 : state.humidity,
          gasValue: state.gasValue === 0 ? 320 : state.gasValue,
          gasThreshold: 1800,
          signalStrength: state.signalStrength === 0 ? 95 : state.signalStrength,
          networkHealth: state.networkHealth === 0 ? 98 : state.networkHealth,
          latencyMs: state.latencyMs === 0 ? 12 : state.latencyMs,
          hardwareConnected: true,
          logs: dbService.getActivityLogs()
        };
      } else {
        return {
          simulationActive: false,
          temperature: 0,
          humidity: 0,
          gasValue: 0,
          gasThreshold: 1800,
          signalStrength: 0,
          networkHealth: 0,
          latencyMs: 0,
          hardwareConnected: false,
          temperatureHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          logs: dbService.getActivityLogs()
        };
      }
    }),

    runSimulationTick: () => {
      const state = get();
      
      // Auto-poll live hardware if active
      if (state.hardwareConfig.mode === 'hardware') {
        state.pollDevices();
        return;
      }

      // Otherwise run simulation if enabled
      if (!state.simulationActive) return;

      set((currentState) => {
        // Slight temperature, humidity, and gas randomization
        let newTemp = currentState.temperature;
        let newHum = currentState.humidity;
        let newGas = currentState.gasValue;
        if (!currentState.isAlarming) {
          newTemp = Number((newTemp + (Math.random() - 0.5)).toFixed(1));
          newHum = Math.min(100, Math.max(20, Math.round(newHum + (Math.random() * 2 - 1))));
          newGas = Math.max(240, Math.min(550, Math.round((newGas || 320) + (Math.random() * 20 - 10))));
        } else if (currentState.smokeActive) {
          newGas = Math.max(2200, Math.min(3200, Math.round((newGas || 2650) + (Math.random() * 60 - 30))));
        }

        const newLatency = Math.floor(Math.random() * 25) + 8;
        const newHistory = [...currentState.temperatureHistory, newTemp].slice(-12);

        return checkSafetyRules({
          temperature: newTemp,
          humidity: newHum,
          gasValue: newGas,
          latencyMs: newLatency,
          temperatureHistory: newHistory
        });
      });
    },

    pollDevices: async () => {
      const state = get();
      if (state.hardwareConfig.mode === 'hardware') {
        const telemetry = await fetchESP32Status(state.hardwareConfig.esp32Ip);
        if (telemetry) {
          const connectedDevices: Device[] = [
            {
              id: `esp32-door-${telemetry.macAddress || 'hub'}`,
              macAddress: telemetry.macAddress || 'ESP32-WIFI-MAC',
              name: 'ESP32 Smart Door Lock',
              deviceType: 'door_lock',
              roomLocation: 'Main Entrance',
              ipAddress: telemetry.ipAddress,
              status: 'active',
              signalStrength: telemetry.signalStrength || 95,
              batteryLevel: 100,
              lastSeenAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            },
            {
              id: `esp32-climate-${telemetry.macAddress || 'hub'}`,
              macAddress: telemetry.macAddress || 'ESP32-WIFI-MAC',
              name: 'ESP32 Climate Sensor (DHT)',
              deviceType: 'climate_sensor',
              roomLocation: 'Living Room',
              ipAddress: telemetry.ipAddress,
              status: 'active',
              signalStrength: telemetry.signalStrength || 95,
              batteryLevel: 100,
              lastSeenAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            },
            {
              id: `esp32-smoke-${telemetry.macAddress || 'hub'}`,
              macAddress: telemetry.macAddress || 'ESP32-WIFI-MAC',
              name: 'ESP32 Gas/Smoke Sensor (MQ-2)',
              deviceType: 'smoke_detector',
              roomLocation: 'Kitchen',
              ipAddress: telemetry.ipAddress,
              status: 'active',
              signalStrength: telemetry.signalStrength || 95,
              batteryLevel: 100,
              lastSeenAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            }
          ];

          set((currentState) => {
            const newHistory = [...currentState.temperatureHistory, telemetry.temperature].slice(-12);
            return checkSafetyRules({
              temperature: telemetry.temperature,
              humidity: telemetry.humidity,
              gasValue: telemetry.gasValue ?? 0,
              gasThreshold: telemetry.gasThreshold ?? 1800,
              isLocked: telemetry.isLocked,
              smokeActive: telemetry.smokeActive || (telemetry.gasValue !== undefined && telemetry.gasValue >= (telemetry.gasThreshold || 1800)),
              isAlarming: telemetry.isAlarming,
              signalStrength: telemetry.signalStrength,
              networkHealth: Math.min(100, Math.max(70, telemetry.signalStrength || 92)),
              latencyMs: 15,
              hardwareConnected: true,
              devices: connectedDevices,
              temperatureHistory: newHistory
            });
          });
          return;
        } else {
          set({
            temperature: 0,
            humidity: 0,
            gasValue: 0,
            gasThreshold: 1800,
            smokeActive: false,
            isAlarming: false,
            signalStrength: 0,
            networkHealth: 0,
            latencyMs: 0,
            hardwareConnected: false,
            devices: [],
            temperatureHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          });
          document.body.classList.remove('emergency-mode');
        }
      }

      // Simulation fallback poll
      if (state.hardwareConfig.mode === 'simulation' || (state.hardwareConfig.mode === 'hardware' && state.isDeveloperMode && state.simulationActive)) {
        const newLatency = Math.floor(Math.random() * 20) + 5;
        const newSignal = Math.min(100, Math.floor(state.signalStrength + (Math.random() * 4 - 2)));
        
        set({
          latencyMs: newLatency,
          signalStrength: newSignal,
          hardwareConnected: true,
          logs: dbService.getActivityLogs()
        });
      }
    },

    updateHardwareConfig: (config) => {
      const current = get().hardwareConfig;
      const updated = { ...current, ...config };
      saveHardwareConfig(updated);
      set({ hardwareConfig: updated });
      dbService.logActivity('admin', 'SYSTEM', `Hardware Mode changed to: ${updated.mode.toUpperCase()} (IP: ${updated.esp32Ip})`);
      // Trigger an immediate device status poll
      setTimeout(() => {
        get().pollDevices();
      }, 50);
    },

    clearDatabaseLogs: () => {
      dbService.resetDatabase();
      set({
        devices: dbService.getDevices(),
        logs: dbService.getActivityLogs(),
        alerts: dbService.getAlerts()
      });
    },

    refreshFromDatabase: () => {
      set({
        devices: dbService.getDevices(),
        logs: dbService.getActivityLogs(),
        alerts: dbService.getAlerts()
      });
    }
  };
});

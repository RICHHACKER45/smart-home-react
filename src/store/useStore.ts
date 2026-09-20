import { create } from 'zustand';
import { dbService } from '../services/dbService';
import { 
  getHardwareConfig, 
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
  temperature: number;
  humidity: number;
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
  isPasskeyModalOpen: boolean;

  // Authentication Actions
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (params: { username: string; email: string; password: string; doorPasskey?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;

  // Primary Actions
  openPasskeyModal: () => void;
  closePasskeyModal: () => void;
  executeAuthenticatedDoorToggle: () => Promise<void>;
  toggleLock: () => void;
  increaseTemp: (amount: number) => void;
  setExactTemperature: (temp: number) => void;
  setExactHumidity: (hum: number) => void;
  simulateSmoke: () => void;
  simulateExtremeHeat: () => void;
  resetSystem: () => void;
  addLog: (text: string, category?: ActivityLog['eventCategory']) => void;
  toggleSimulation: () => void;
  runSimulationTick: () => void;
  pollDevices: () => Promise<void>;

  // Hardware Configuration & Testing Helpers
  updateHardwareConfig: (config: Partial<HardwareConfig>) => void;
  seedDemoLogs: () => void;
  clearDatabaseLogs: () => void;
  refreshFromDatabase: () => void;
}

export const useStore = create<SmartHomeState>((set, get) => {
  const checkSafetyRules = (state: Partial<SmartHomeState>) => {
    const current = get();
    const temp = state.temperature ?? current.temperature;
    const smoke = state.smokeActive ?? current.smokeActive;
    
    let isAlarming = current.isAlarming;
    let isLocked = state.isLocked ?? current.isLocked;

    if (temp >= 45 || smoke) {
      if (!isAlarming) {
        dbService.createAlert(
          smoke ? 'SMOKE_DETECTED' : 'CRITICAL_HEAT', 
          smoke ? 'Dense Smoke Detected' : `${temp}°C High Heat`
        );
      }
      isAlarming = true;
      isLocked = false;
      document.body.classList.add('emergency-mode');
    } else if (!current.isAlarming) {
      document.body.classList.remove('emergency-mode');
    }

    return { 
      ...state, 
      isAlarming, 
      isLocked,
      logs: dbService.getActivityLogs(),
      alerts: dbService.getAlerts()
    };
  };

  const initialSession = dbService.getCurrentSession();

  return {
    isAuthenticated: initialSession !== null,
    currentUser: initialSession,
    isLocked: true,
    temperature: 24.8,
    humidity: 47,
    latencyMs: 12,
    signalStrength: 98,
    networkHealth: 96,
    isAlarming: false,
    smokeActive: false,
    temperatureHistory: [24.0, 24.2, 24.5, 24.3, 24.7, 24.8, 25.0, 24.9, 24.8, 24.7, 24.8, 24.8],
    devices: dbService.getDevices(initialSession?.id),
    logs: dbService.getActivityLogs(),
    alerts: dbService.getAlerts(),
    simulationActive: true,
    hardwareConfig: getHardwareConfig(),
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
        devices: dbService.getDevices(),
        logs: dbService.getActivityLogs()
      });
    },

    openPasskeyModal: () => set({ isPasskeyModalOpen: true }),
    closePasskeyModal: () => set({ isPasskeyModalOpen: false }),

    executeAuthenticatedDoorToggle: async () => {
      const state = get();
      if (state.isAlarming) return;

      const newLocked = !state.isLocked;

      // If live hardware is configured, send command to ESP32
      if (state.hardwareConfig.mode === 'hardware') {
        const res = await sendESP32DoorCommand(state.hardwareConfig.esp32Ip, newLocked ? 'lock' : 'unlock');
        if (!res.success) {
          dbService.logActivity('Hardware Error', 'DOOR', `ESP32 door control failed: ${res.message}`, 'FAILED');
        }
      }

      const actor = state.currentUser ? state.currentUser.username : 'admin';
      dbService.logActivity(
        actor, 
        'DOOR', 
        `Door ${newLocked ? 'Locked' : 'Unlocked'} via Passkey Verification`, 
        'SUCCESS'
      );

      set(checkSafetyRules({
        isLocked: newLocked,
        isPasskeyModalOpen: false
      }));
    },

    toggleLock: () => {
      const state = get();
      if (state.isAlarming) return;
      // Open security passkey modal instead of direct bypass
      set({ isPasskeyModalOpen: true });
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

    simulateSmoke: () => set(() => {
      return checkSafetyRules({
        smokeActive: true
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
      dbService.logActivity('admin', 'SYSTEM', 'System emergency reset executed to normal state');
      set((s) => ({
        isLocked: true,
        temperature: 24.8,
        humidity: 47,
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
      dbService.logActivity('App User', category, text);
      set({ logs: dbService.getActivityLogs() });
    },

    toggleSimulation: () => set((state) => {
      const next = !state.simulationActive;
      dbService.logActivity('admin', 'SYSTEM', `Data Simulation ${next ? 'Enabled' : 'Disabled'}`);
      return {
        simulationActive: next,
        logs: dbService.getActivityLogs()
      };
    }),

    runSimulationTick: () => set((state) => {
      if (!state.simulationActive || state.hardwareConfig.mode === 'hardware') return {};

      // Slight temperature randomization
      let newTemp = state.temperature;
      if (!state.isAlarming) {
        newTemp = Number((newTemp + (Math.random() - 0.5)).toFixed(1));
      }

      const newLatency = Math.floor(Math.random() * 25) + 8;
      const newHistory = [...state.temperatureHistory, newTemp].slice(-12);

      return checkSafetyRules({
        temperature: newTemp,
        latencyMs: newLatency,
        temperatureHistory: newHistory
      });
    }),

    pollDevices: async () => {
      const state = get();
      if (state.hardwareConfig.mode === 'hardware') {
        const telemetry = await fetchESP32Status(state.hardwareConfig.esp32Ip);
        if (telemetry) {
          dbService.logActivity('ESP32 Hub', 'SYSTEM', `Live telemetry synced (${telemetry.temperature}°C, ${telemetry.humidity}%)`);
          set(checkSafetyRules({
            temperature: telemetry.temperature,
            humidity: telemetry.humidity,
            isLocked: telemetry.isLocked,
            smokeActive: telemetry.smokeActive,
            isAlarming: telemetry.isAlarming,
            signalStrength: telemetry.signalStrength,
            latencyMs: 15
          }));
          return;
        } else {
          dbService.logActivity('ESP32 Hub', 'SYSTEM', 'Failed to poll ESP32 - Hardware unreachable', 'FAILED');
        }
      }

      // Simulation fallback poll
      const newLatency = Math.floor(Math.random() * 20) + 5;
      const newSignal = Math.min(100, Math.floor(state.signalStrength + (Math.random() * 4 - 2)));
      dbService.logActivity('Diagnostics', 'SYSTEM', 'Device connection ping test completed');
      set({
        latencyMs: newLatency,
        signalStrength: newSignal,
        logs: dbService.getActivityLogs()
      });
    },

    updateHardwareConfig: (config) => {
      const current = get().hardwareConfig;
      const updated = { ...current, ...config };
      set({ hardwareConfig: updated });
      dbService.logActivity('admin', 'SYSTEM', `Hardware Mode changed to: ${updated.mode.toUpperCase()}`);
    },

    seedDemoLogs: () => {
      dbService.seedTestActivityLogs();
      set({ logs: dbService.getActivityLogs() });
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

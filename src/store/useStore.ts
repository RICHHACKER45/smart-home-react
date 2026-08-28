import { create } from 'zustand';

export interface LogEntry {
  text: string;
  time: string;
}

interface SmartHomeState {
  isLocked: boolean;
  temperature: number;
  humidity: number;
  latencyMs: number;
  signalStrength: number;
  networkHealth: number;
  isAlarming: boolean;
  smokeActive: boolean;
  temperatureHistory: number[];
  logs: LogEntry[];
  simulationActive: boolean;

  // Actions
  toggleLock: () => void;
  increaseTemp: (amount: number) => void;
  simulateSmoke: () => void;
  resetSystem: () => void;
  addLog: (text: string) => void;
  toggleSimulation: () => void;
  runSimulationTick: () => void;
}

export const useStore = create<SmartHomeState>((set, get) => {
  const checkSafetyRules = (state: Partial<SmartHomeState>) => {
    const current = get();
    const temp = state.temperature ?? current.temperature;
    const smoke = state.smokeActive ?? current.smokeActive;
    
    let isAlarming = current.isAlarming;
    let isLocked = state.isLocked ?? current.isLocked;

    if (temp >= 45 || smoke) {
      isAlarming = true;
      isLocked = false;
      document.body.classList.add('emergency-mode');
    } else if (!current.isAlarming) {
       document.body.classList.remove('emergency-mode');
    }

    return { ...state, isAlarming, isLocked };
  };

  const addLogBase = (text: string, currentLogs: LogEntry[]) => {
    const newLog = { text, time: new Date().toLocaleTimeString() };
    return [newLog, ...currentLogs].slice(0, 50); // Keep last 50 logs
  };

  return {
    isLocked: true,
    temperature: 24.8,
    humidity: 47,
    latencyMs: 12,
    signalStrength: 98,
    networkHealth: 96,
    isAlarming: false,
    smokeActive: false,
    temperatureHistory: Array(12).fill(24.8),
    logs: [],
    simulationActive: true,

    toggleLock: () => set((state) => {
      if (state.isAlarming) return {}; // Cannot lock during alarm
      const newLocked = !state.isLocked;
      return checkSafetyRules({
        isLocked: newLocked,
        logs: addLogBase(`Door ${newLocked ? 'Locked' : 'Unlocked'}`, state.logs)
      });
    }),

    increaseTemp: (amount) => set((state) => {
      const newTemp = Number((state.temperature + amount).toFixed(1));
      return checkSafetyRules({
        temperature: newTemp,
        logs: addLogBase(`Temperature increased by ${amount}°C to ${newTemp}°C`, state.logs)
      });
    }),

    simulateSmoke: () => set((state) => {
      return checkSafetyRules({
        smokeActive: true,
        logs: addLogBase('Smoke detected!', state.logs)
      });
    }),

    resetSystem: () => {
      document.body.classList.remove('emergency-mode');
      set((state) => ({
        isLocked: true,
        temperature: 24.8,
        humidity: 47,
        latencyMs: 12,
        signalStrength: 98,
        networkHealth: 96,
        isAlarming: false,
        smokeActive: false,
        temperatureHistory: Array(12).fill(24.8),
        logs: addLogBase('System reset to default state', state.logs)
      }));
    },

    addLog: (text) => set((state) => ({
      logs: addLogBase(text, state.logs)
    })),

    toggleSimulation: () => set((state) => ({
      simulationActive: !state.simulationActive,
      logs: addLogBase(`Simulation ${!state.simulationActive ? 'Started' : 'Stopped'}`, state.logs)
    })),

    runSimulationTick: () => set((state) => {
      if (!state.simulationActive) return {};

      // Randomize temp slightly (-0.5 to +0.5) unless alarming
      let newTemp = state.temperature;
      if (!state.isAlarming) {
        newTemp = Number((newTemp + (Math.random() - 0.5)).toFixed(1));
      }

      // Randomize latency (8 to 40)
      const newLatency = Math.floor(Math.random() * 32) + 8;
      
      // Update temperature history (sliding window of 12)
      const newHistory = [...state.temperatureHistory, newTemp].slice(-12);

      return checkSafetyRules({
        temperature: newTemp,
        latencyMs: newLatency,
        temperatureHistory: newHistory
      });
    })
  };
});

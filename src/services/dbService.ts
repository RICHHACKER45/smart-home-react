/**
 * Persistent Database Service with Cloud Supabase Sync
 * Implements Authentication, CRUD, audit logging, and realtime cloud sync.
 */

import { 
  Account, 
  Device, 
  SensorReading, 
  DailyClimateSummary, 
  ActivityLog, 
  EmergencyAlert,
  EventCategory,
  LogStatusResult
} from '../types/database';
import { supabaseApi } from './supabaseClient';

const STORAGE_PREFIX = 'smart_home_db_';

const DEFAULT_ADMIN: Account = {
  id: 'acc-admin-01',
  username: 'admin',
  email: 'admin@smarthome.local',
  passwordHash: 'password123', // Standard initial password for testing
  doorPasskeyHash: '1234',      // Default 4-digit PIN for door lock/unlock
  role: 'admin',
  status: 'active',
  createdAt: new Date().toISOString()
};

const DEFAULT_DEVICES: Device[] = [
  {
    id: 'dev-door-01',
    macAddress: 'B8:27:EB:44:11:01',
    name: 'Front Main Entrance Lock',
    deviceType: 'door_lock',
    roomLocation: 'Main Entrance',
    ipAddress: '192.168.1.101',
    status: 'active',
    signalStrength: 98,
    batteryLevel: 92,
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'dev-climate-01',
    macAddress: 'B8:27:EB:44:11:02',
    name: 'Living Room Climate Sensor (DHT22)',
    deviceType: 'climate_sensor',
    roomLocation: 'Living Room',
    ipAddress: '192.168.1.102',
    status: 'active',
    signalStrength: 95,
    batteryLevel: 88,
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'dev-smoke-01',
    macAddress: 'B8:27:EB:44:11:03',
    name: 'Kitchen Smoke & Gas Detector (MQ-2)',
    deviceType: 'smoke_detector',
    roomLocation: 'Kitchen',
    ipAddress: '192.168.1.103',
    status: 'active',
    signalStrength: 91,
    batteryLevel: 97,
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 1,
    actorName: 'System Boot',
    eventCategory: 'SYSTEM',
    actionDescription: 'Smart Home Gateway initialized with 3 active devices',
    statusResult: 'SUCCESS',
    createdAt: new Date(Date.now() - 3600000).toLocaleTimeString()
  },
  {
    id: 2,
    actorName: 'admin',
    eventCategory: 'AUTH',
    actionDescription: 'Administrator logged into mobile app',
    statusResult: 'SUCCESS',
    createdAt: new Date(Date.now() - 1800000).toLocaleTimeString()
  },
  {
    id: 3,
    actorName: 'Front Door Lock',
    eventCategory: 'DOOR',
    actionDescription: 'Door locked via primary schedule',
    statusResult: 'SUCCESS',
    createdAt: new Date(Date.now() - 900000).toLocaleTimeString()
  }
];

class DatabaseService {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('[DB] Storage write error:', e);
    }
  }

  // --- ACCOUNTS & AUTHENTICATION ---
  getAccount(): Account {
    return this.getItem<Account>('account', DEFAULT_ADMIN);
  }

  getCurrentSession(): Account | null {
    return this.getItem<Account | null>('current_session', null);
  }

  authenticate(username: string, password: string): { success: boolean; account?: Account; message?: string } {
    const acc = this.getAccount();
    if (acc.username.toLowerCase() === username.trim().toLowerCase() && acc.passwordHash === password) {
      this.setItem('current_session', acc);
      this.logActivity(acc.username, 'AUTH', `User "${acc.username}" successfully logged in`, 'SUCCESS');
      return { success: true, account: acc };
    }
    this.logActivity(username || 'Unknown', 'AUTH', `Failed login attempt for username "${username}"`, 'FAILED');
    return { success: false, message: 'Invalid username or password. Please try again.' };
  }

  logout(): void {
    const session = this.getCurrentSession();
    if (session) {
      this.logActivity(session.username, 'AUTH', `User "${session.username}" logged out`, 'SUCCESS');
    }
    localStorage.removeItem(STORAGE_PREFIX + 'current_session');
  }

  verifyPasskey(pin: string): boolean {
    const acc = this.getAccount();
    return acc.doorPasskeyHash === pin;
  }

  updatePasskey(newPin: string): void {
    const acc = this.getAccount();
    acc.doorPasskeyHash = newPin;
    this.setItem('account', acc);
    this.logActivity(acc.username, 'AUTH', `Door passkey updated to ${newPin}`, 'SUCCESS');

    // Sync to Supabase Accounts Table
    supabaseApi.updateDoorPasskey(acc.id, newPin).catch(() => {});
  }

  updatePassword(newPassword: string): void {
    const acc = this.getAccount();
    acc.passwordHash = newPassword;
    this.setItem('account', acc);
    this.logActivity(acc.username, 'AUTH', 'Account password successfully updated', 'SUCCESS');
  }

  // --- DEVICES ---
  getDevices(): Device[] {
    return this.getItem<Device[]>('devices', DEFAULT_DEVICES);
  }

  updateDeviceStatus(deviceId: string, status: Device['status']): void {
    const devices = this.getDevices().map(d => d.id === deviceId ? { ...d, status, lastSeenAt: new Date().toISOString() } : d);
    this.setItem('devices', devices);
  }

  // --- ACTIVITY LOGS ---
  getActivityLogs(): ActivityLog[] {
    return this.getItem<ActivityLog[]>('logs', INITIAL_LOGS);
  }

  logActivity(
    actorName: string,
    eventCategory: EventCategory,
    actionDescription: string,
    statusResult: LogStatusResult = 'SUCCESS',
    deviceId?: string
  ): ActivityLog {
    const logs = this.getActivityLogs();
    const newLog: ActivityLog = {
      id: Date.now(),
      actorName,
      deviceId,
      eventCategory,
      actionDescription,
      statusResult,
      createdAt: new Date().toLocaleTimeString()
    };
    const updated = [newLog, ...logs].slice(0, 100);
    this.setItem('logs', updated);

    // Asynchronously sync with Supabase Cloud DB
    supabaseApi.insertActivityLog(actorName, eventCategory, actionDescription, statusResult, deviceId).catch(() => {});

    return newLog;
  }

  // --- EMERGENCY ALERTS ---
  getAlerts(): EmergencyAlert[] {
    return this.getItem<EmergencyAlert[]>('alerts', []);
  }

  createAlert(type: EmergencyAlert['alertType'], peakValue: string): EmergencyAlert {
    const alerts = this.getAlerts();
    const newAlert: EmergencyAlert = {
      id: Date.now(),
      deviceId: 'dev-smoke-01',
      alertType: type,
      peakValue,
      autoUnlockExecuted: true,
      status: 'TRIGGERED',
      triggeredAt: new Date().toISOString()
    };
    this.setItem('alerts', [newAlert, ...alerts]);
    this.logActivity('Emergency Failsafe', 'EMERGENCY', `🚨 ${type}: ${peakValue} (Failsafe Auto-Unlock Activated)`, 'TRIGGERED');

    // Sync Alert to Supabase Cloud DB
    supabaseApi.createEmergencyAlert('dev-smoke-01', type, peakValue).catch(() => {});

    return newAlert;
  }

  // --- TESTING & QA UTILITIES ---
  seedTestActivityLogs(): void {
    const mockEvents: Array<{ cat: EventCategory; desc: string; res: LogStatusResult }> = [
      { cat: 'DOOR', desc: 'Door unlocked with Passkey (PIN: 1234)', res: 'SUCCESS' },
      { cat: 'DOOR', desc: 'Door locked manually via App', res: 'SUCCESS' },
      { cat: 'AUTH', desc: 'Failed door unlock attempt - Invalid PIN entered', res: 'FAILED' },
      { cat: 'CLIMATE', desc: 'Daily Peak Temperature recorded: 32.4°C at 13:45', res: 'SUCCESS' },
      { cat: 'EMERGENCY', desc: 'Smoke Sensor MQ-2 self-test completed with 0 errors', res: 'SUCCESS' },
      { cat: 'SYSTEM', desc: 'Network ping refreshed: 14ms latency', res: 'SUCCESS' },
      { cat: 'DOOR', desc: 'Auto-unlock failsafe triggered by temperature spike', res: 'TRIGGERED' },
      { cat: 'AUTH', desc: 'Admin session refreshed', res: 'SUCCESS' }
    ];

    const currentLogs = this.getActivityLogs();
    const seeded = mockEvents.map((ev, index) => ({
      id: Date.now() + index,
      actorName: 'QA Test Bot',
      eventCategory: ev.cat,
      actionDescription: `[TEST SAMPLE] ${ev.desc}`,
      statusResult: ev.res,
      createdAt: new Date(Date.now() - (index + 1) * 120000).toLocaleTimeString()
    }));

    this.setItem('logs', [...seeded, ...currentLogs].slice(0, 100));
  }

  resetDatabase(): void {
    localStorage.removeItem(STORAGE_PREFIX + 'account');
    localStorage.removeItem(STORAGE_PREFIX + 'devices');
    localStorage.removeItem(STORAGE_PREFIX + 'logs');
    localStorage.removeItem(STORAGE_PREFIX + 'alerts');
    localStorage.removeItem(STORAGE_PREFIX + 'current_session');
    this.setItem('account', DEFAULT_ADMIN);
    this.setItem('devices', DEFAULT_DEVICES);
    this.setItem('logs', INITIAL_LOGS);
    this.setItem('alerts', []);
  }

  exportDatabaseJson(): string {
    return JSON.stringify({
      account: this.getAccount(),
      devices: this.getDevices(),
      logs: this.getActivityLogs(),
      alerts: this.getAlerts(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

export const dbService = new DatabaseService();

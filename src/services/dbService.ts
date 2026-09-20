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

// Helper generator for starter devices for a specific account
const createStarterDevices = (ownerAccountId: string): Device[] => [
  {
    id: `dev-door-${ownerAccountId.slice(-6)}`,
    ownerAccountId,
    macAddress: `B8:27:EB:${ownerAccountId.slice(-2)}:11:01`,
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
    id: `dev-climate-${ownerAccountId.slice(-6)}`,
    ownerAccountId,
    macAddress: `B8:27:EB:${ownerAccountId.slice(-2)}:11:02`,
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
    id: `dev-smoke-${ownerAccountId.slice(-6)}`,
    ownerAccountId,
    macAddress: `B8:27:EB:${ownerAccountId.slice(-2)}:11:03`,
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
  getAccounts(): Account[] {
    const accounts = this.getItem<Account[]>('accounts', [DEFAULT_ADMIN]);
    // Ensure default admin exists
    if (!accounts.some(a => a.username === DEFAULT_ADMIN.username || a.id === DEFAULT_ADMIN.id)) {
      accounts.unshift(DEFAULT_ADMIN);
      this.setItem('accounts', accounts);
    }
    return accounts;
  }

  getAccount(): Account {
    const session = this.getCurrentSession();
    if (session) return session;
    const accounts = this.getAccounts();
    return accounts[0] || DEFAULT_ADMIN;
  }

  getCurrentSession(): Account | null {
    return this.getItem<Account | null>('current_session', null);
  }

  async authenticate(identifier: string, password: string): Promise<{ success: boolean; account?: Account; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const accounts = this.getAccounts();

    // 1. Try local cache match first
    let matched = accounts.find(a => 
      a.username.toLowerCase() === cleanId || 
      (a.email && a.email.toLowerCase() === cleanId)
    );

    if (matched) {
      if (matched.passwordHash === password) {
        this.setItem('current_session', matched);
        this.logActivity(matched.username, 'AUTH', `User "${matched.username}" logged in`, 'SUCCESS');
        return { success: true, account: matched };
      }
      this.logActivity(identifier, 'AUTH', `Failed password attempt for "${identifier}"`, 'FAILED');
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    // 2. Query Supabase Cloud for remote accounts
    try {
      const cloudAccount = await supabaseApi.findAccount(cleanId);
      if (cloudAccount) {
        if (cloudAccount.passwordHash === password) {
          // Cache locally
          const updated = [...accounts.filter(a => a.id !== cloudAccount.id), cloudAccount];
          this.setItem('accounts', updated);
          this.setItem('current_session', cloudAccount);
          this.logActivity(cloudAccount.username, 'AUTH', `User "${cloudAccount.username}" logged in via Cloud`, 'SUCCESS');
          return { success: true, account: cloudAccount };
        }
        this.logActivity(identifier, 'AUTH', `Failed cloud password attempt for "${identifier}"`, 'FAILED');
        return { success: false, message: 'Incorrect password. Please try again.' };
      }
    } catch {
      // Fallback
    }

    this.logActivity(identifier || 'Unknown', 'AUTH', `Login failed: Account "${identifier}" not found`, 'FAILED');
    return { success: false, message: 'No account found with that username or email.' };
  }

  async register(params: {
    username: string;
    email: string;
    password: string;
    doorPasskey?: string;
  }): Promise<{ success: boolean; account?: Account; message?: string }> {
    const cleanUsername = params.username.trim();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPass = params.password.trim();
    const cleanPin = params.doorPasskey?.trim() || '1234';

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    const accounts = this.getAccounts();

    // Check if username or email is already taken locally
    if (accounts.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return { success: false, message: 'Username is already taken. Please choose another.' };
    }
    if (accounts.some(a => a.email && a.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Email is already registered. Please sign in instead.' };
    }

    // Check if taken on Supabase Cloud
    try {
      const existingRemote = await supabaseApi.findAccount(cleanUsername);
      if (existingRemote) {
        return { success: false, message: 'Username is already in use.' };
      }
      const existingEmail = await supabaseApi.findAccount(cleanEmail);
      if (existingEmail) {
        return { success: false, message: 'Email is already registered.' };
      }
    } catch {}

    const newAccountId = `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const newAccount: Account = {
      id: newAccountId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: cleanPass,
      doorPasskeyHash: cleanPin,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Save locally
    const updatedAccounts = [...accounts, newAccount];
    this.setItem('accounts', updatedAccounts);
    this.setItem('current_session', newAccount);

    // Auto-provision devices for this account
    const existingDevices = this.getDevices();
    const newDevices = createStarterDevices(newAccountId);
    this.setItem('devices', [...existingDevices, ...newDevices]);

    // Record activity
    this.logActivity(cleanUsername, 'AUTH', `New account created for "${cleanUsername}" (${cleanEmail})`, 'SUCCESS');

    // Sync to Supabase in background
    supabaseApi.createAccount(newAccount).catch(err => console.warn('[Supabase] Account sync failed:', err));

    return { success: true, account: newAccount };
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

    // Update in local accounts list
    const accounts = this.getAccounts().map(a => a.id === acc.id ? { ...a, doorPasskeyHash: newPin } : a);
    this.setItem('accounts', accounts);
    this.setItem('current_session', acc);
    this.setItem('account', acc);

    this.logActivity(acc.username, 'AUTH', `Door passkey updated to ${newPin}`, 'SUCCESS');

    // Sync to Supabase Accounts Table
    supabaseApi.updateDoorPasskey(acc.id, newPin).catch(() => {});
  }

  updatePassword(newPassword: string): void {
    const acc = this.getAccount();
    acc.passwordHash = newPassword;

    // Update in local accounts list
    const accounts = this.getAccounts().map(a => a.id === acc.id ? { ...a, passwordHash: newPassword } : a);
    this.setItem('accounts', accounts);
    this.setItem('current_session', acc);
    this.setItem('account', acc);

    this.logActivity(acc.username, 'AUTH', 'Account password successfully updated', 'SUCCESS');

    // Sync to Supabase
    supabaseApi.updatePassword(acc.id, newPassword).catch(() => {});
  }

  // --- DEVICES ---
  getDevices(accountId?: string): Device[] {
    const currentAcc = accountId || this.getCurrentSession()?.id;
    const allDevices = this.getItem<Device[]>('devices', DEFAULT_DEVICES);

    if (!currentAcc) {
      return allDevices;
    }

    const userDevices = allDevices.filter(d => !d.ownerAccountId || d.ownerAccountId === currentAcc);
    if (userDevices.length === 0) {
      // Return default devices if no user-specific devices exist yet
      return DEFAULT_DEVICES;
    }
    return userDevices;
  }

  updateDeviceStatus(deviceId: string, status: Device['status']): void {
    const allDevices = this.getItem<Device[]>('devices', DEFAULT_DEVICES);
    const updated = allDevices.map(d => d.id === deviceId ? { ...d, status, lastSeenAt: new Date().toISOString() } : d);
    this.setItem('devices', updated);
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
    const session = this.getCurrentSession();
    const newLog: ActivityLog = {
      id: Date.now(),
      accountId: session?.id,
      actorName: actorName || session?.username || 'User',
      deviceId,
      eventCategory,
      actionDescription,
      statusResult,
      createdAt: new Date().toLocaleTimeString()
    };
    const updated = [newLog, ...logs].slice(0, 100);
    this.setItem('logs', updated);

    // Asynchronously sync with Supabase Cloud DB
    supabaseApi.insertActivityLog(newLog.actorName!, eventCategory, actionDescription, statusResult, deviceId).catch(() => {});

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
    localStorage.removeItem(STORAGE_PREFIX + 'accounts');
    localStorage.removeItem(STORAGE_PREFIX + 'account');
    localStorage.removeItem(STORAGE_PREFIX + 'devices');
    localStorage.removeItem(STORAGE_PREFIX + 'logs');
    localStorage.removeItem(STORAGE_PREFIX + 'alerts');
    localStorage.removeItem(STORAGE_PREFIX + 'current_session');
    this.setItem('accounts', [DEFAULT_ADMIN]);
    this.setItem('account', DEFAULT_ADMIN);
    this.setItem('devices', DEFAULT_DEVICES);
    this.setItem('logs', INITIAL_LOGS);
    this.setItem('alerts', []);
  }

  exportDatabaseJson(): string {
    return JSON.stringify({
      accounts: this.getAccounts(),
      currentSession: this.getCurrentSession(),
      devices: this.getDevices(),
      logs: this.getActivityLogs(),
      alerts: this.getAlerts(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

export const dbService = new DatabaseService();

/**
 * Supabase Cloud Client & REST Data Bridge
 * Provides direct, authenticated cloud persistence for the Smart Home system.
 */

import { Account, Device, ActivityLog, EmergencyAlert } from '../types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
});

export const supabaseApi = {
  // Test connection to Supabase
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=*&limit=1`, {
        headers: getHeaders()
      });
      if (res.ok) {
        return { success: true, message: 'Connected to Supabase Cloud Database' };
      }
      return { success: false, message: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Network connection error' };
    }
  },

  // --- ACCOUNTS & AUTHENTICATION ---
  async getAccount(username: string = 'admin'): Promise<Account | null> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?username=eq.${encodeURIComponent(username)}&select=*&limit=1`, {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.length > 0) {
        const acc = data[0];
        return {
          id: acc.id,
          username: acc.username,
          email: acc.email,
          passwordHash: acc.password_hash,
          doorPasskeyHash: acc.door_passkey_hash,
          status: acc.status,
          fcmPushToken: acc.fcm_push_token,
          createdAt: acc.created_at
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async findAccount(identifier: string): Promise<Account | null> {
    try {
      const cleanId = identifier.trim().toLowerCase();
      const isEmail = cleanId.includes('@');
      const query = isEmail ? `email=eq.${encodeURIComponent(cleanId)}` : `username=eq.${encodeURIComponent(cleanId)}`;
      
      const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?${query}&select=*&limit=1`, {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.length > 0) {
        const acc = data[0];
        return {
          id: acc.id,
          username: acc.username,
          email: acc.email,
          passwordHash: acc.password_hash,
          doorPasskeyHash: acc.door_passkey_hash,
          status: acc.status,
          fcmPushToken: acc.fcm_push_token,
          createdAt: acc.created_at
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async createAccount(account: Account): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: account.id,
          username: account.username,
          email: account.email || null,
          password_hash: account.passwordHash,
          door_passkey_hash: account.doorPasskeyHash || '1234',
          status: account.status || 'active',
          created_at: account.createdAt || new Date().toISOString()
        })
      });

      if (res.ok) {
        return { success: true };
      }
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || `HTTP ${res.status}: Account creation failed` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Network error creating account' };
    }
  },

  async updatePassword(accountId: string, newPassword: string): Promise<boolean> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          password_hash: newPassword,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async updateDoorPasskey(accountId: string, newPin: string): Promise<boolean> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          door_passkey_hash: newPin,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- DEVICES ---
  async getDevices(): Promise<Device[] | null> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/devices?select=*`, {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        macAddress: d.mac_address,
        name: d.name,
        deviceType: d.device_type,
        roomLocation: d.room_location,
        ipAddress: d.ip_address,
        status: d.status,
        signalStrength: d.signal_strength,
        batteryLevel: d.battery_level,
        lastSeenAt: d.last_seen_at,
        createdAt: d.created_at
      }));
    } catch {
      return null;
    }
  },

  // --- SENSOR TELEMETRY ---
  async insertSensorReading(deviceId: string, temperature: number, humidity: number, smokeDetected: boolean) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sensor_readings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          device_id: deviceId,
          temperature,
          humidity,
          smoke_detected: smokeDetected
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- ACTIVITY AUDIT LOGS ---
  async insertActivityLog(
    actorName: string, 
    eventCategory: string, 
    actionDescription: string, 
    statusResult: string = 'SUCCESS',
    deviceId?: string
  ) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          actor_name: actorName,
          event_category: eventCategory,
          action_description: actionDescription,
          status_result: statusResult,
          device_id: deviceId
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getRecentLogs(limit: number = 50): Promise<ActivityLog[] | null> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs?order=created_at.desc&limit=${limit}`, {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.map((l: any) => ({
        id: l.id,
        accountId: l.account_id,
        actorName: l.actor_name,
        deviceId: l.device_id,
        eventCategory: l.event_category,
        actionDescription: l.action_description,
        statusResult: l.status_result,
        ipOrigin: l.ip_origin,
        createdAt: new Date(l.created_at).toLocaleTimeString()
      }));
    } catch {
      return null;
    }
  },

  // --- EMERGENCY ALERTS ---
  async createEmergencyAlert(deviceId: string, alertType: string, peakValue: string): Promise<boolean> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/emergency_alerts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          device_id: deviceId,
          alert_type: alertType,
          peak_value: peakValue,
          auto_unlock_executed: true,
          status: 'TRIGGERED'
        })
      });
      return res.ok;
    } catch {
      return false;
    }
  }
};

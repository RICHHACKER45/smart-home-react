/**
 * Database Models & Entity Definitions
 * Matching the relational database schema in IMPLEMENTATION.md
 */

export type AccountStatus = 'active' | 'suspended';
export type DeviceType = 'door_lock' | 'climate_sensor' | 'smoke_detector' | 'combo_hub';
export type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';
export type EventCategory = 'AUTH' | 'DOOR' | 'CLIMATE' | 'EMERGENCY' | 'SYSTEM';
export type LogStatusResult = 'SUCCESS' | 'FAILED' | 'TRIGGERED' | 'DISMISSED';
export type AlertType = 'SMOKE_DETECTED' | 'CRITICAL_HEAT' | 'MANUAL_PANIC';
export type AlertStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Account {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  doorPasskeyHash: string; // 4-6 digit hashed PIN
  status: AccountStatus;
  fcmPushToken?: string;
  createdAt: string;
}

export interface Device {
  id: string;
  ownerAccountId?: string;
  macAddress: string;
  name: string;
  deviceType: DeviceType;
  roomLocation: string;
  ipAddress?: string;
  status: DeviceStatus;
  signalStrength: number;
  batteryLevel?: number;
  lastSeenAt?: string;
  createdAt: string;
}

export interface SensorReading {
  id: number;
  deviceId: string;
  temperature: number;
  humidity?: number;
  smokeDetected: boolean;
  recordedAt: string;
}

export interface DailyClimateSummary {
  id: number;
  deviceId: string;
  recordDate: string; // YYYY-MM-DD
  maxTemperature: number;
  minTemperature: number;
  avgTemperature: number;
  avgHumidity?: number;
}

export interface ActivityLog {
  id: number;
  accountId?: string;
  actorName?: string;
  deviceId?: string;
  deviceName?: string;
  eventCategory: EventCategory;
  actionDescription: string;
  statusResult: LogStatusResult;
  ipOrigin?: string;
  createdAt: string;
}

export interface EmergencyAlert {
  id: number;
  deviceId: string;
  alertType: AlertType;
  peakValue?: string;
  autoUnlockExecuted: boolean;
  status: AlertStatus;
  resolvedByAccountId?: string;
  triggeredAt: string;
  resolvedAt?: string;
}

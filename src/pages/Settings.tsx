import React, { useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonButton, 
  IonInput, 
  IonItem, 
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonIcon,
  useIonAlert,
  useIonToast
} from '@ionic/react';
import { 
  hardwareChipOutline, 
  shieldCheckmarkOutline, 
  bugOutline, 
  refreshOutline, 
  flameOutline, 
  snowOutline,
  sparklesOutline,
  cloudDownloadOutline,
  keyOutline,
  serverOutline
} from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { dbService } from '../services/dbService';

const Settings: React.FC = () => {
  const { 
    increaseTemp, 
    setExactTemperature,
    setExactHumidity,
    simulateSmoke, 
    simulateExtremeHeat,
    resetSystem, 
    simulationActive, 
    toggleSimulation,
    signalStrength, 
    networkHealth, 
    latencyMs, 
    isLocked, 
    pollDevices,
    devices,
    hardwareConfig,
    updateHardwareConfig,
    seedDemoLogs,
    clearDatabaseLogs
  } = useStore();

  const [espIpInput, setEspIpInput] = useState<string>(hardwareConfig.esp32Ip);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const handleSaveHardwareIp = () => {
    updateHardwareConfig({ esp32Ip: espIpInput });
    presentToast({
      message: `ESP32 Target IP updated to ${espIpInput}`,
      duration: 2000,
      color: 'success'
    });
  };

  const handleModeChange = (mode: 'simulation' | 'hardware') => {
    updateHardwareConfig({ mode });
    presentToast({
      message: `Active Mode switched to: ${mode === 'hardware' ? 'LIVE ESP32' : 'SIMULATION'}`,
      duration: 2500,
      color: 'primary'
    });
  };

  const handleChangePasskeyPrompt = () => {
    presentAlert({
      header: 'Change Door Passkey',
      message: 'Enter a new 4-digit PIN for locking and unlocking the door.',
      inputs: [
        {
          name: 'newPin',
          type: 'password',
          placeholder: 'New 4-digit PIN (e.g. 5678)',
          attributes: { maxlength: 4, inputmode: 'numeric' }
        }
      ],
      buttons: [
        'Cancel',
        {
          text: 'Save PIN',
          handler: (data) => {
            if (data.newPin && data.newPin.length === 4) {
              dbService.updatePasskey(data.newPin);
              presentToast({
                message: `Passkey updated to: ${data.newPin}`,
                duration: 2500,
                color: 'success'
              });
            } else {
              presentToast({
                message: 'PIN must be exactly 4 digits.',
                duration: 2500,
                color: 'danger'
              });
            }
          }
        }
      ]
    });
  };

  const handleSimulateFailedAuth = () => {
    dbService.logActivity('Intruder / Wrong PIN', 'AUTH', 'Failed door unlock attempt - Invalid PIN entered (QA Test)', 'FAILED');
    presentToast({
      message: 'Simulated Security Alert: Failed passkey logged to Activity tab',
      duration: 2500,
      color: 'warning'
    });
  };

  const handleExportJson = () => {
    const jsonStr = dbService.exportDatabaseJson();
    console.log('[DATABASE EXPORT]', jsonStr);
    
    // Copy to clipboard or prompt alert with stats
    navigator.clipboard?.writeText(jsonStr);
    presentAlert({
      header: 'Database Snapshot Exported',
      message: 'Database JSON snapshot copied to clipboard and logged in Developer Console.',
      buttons: ['OK']
    });
  };

  const handleFactoryResetPrompt = () => {
    presentAlert({
      header: 'Factory Reset Database?',
      message: 'This will reset all accounts, devices, and activity logs back to fresh defaults.',
      buttons: [
        'Cancel',
        {
          text: 'Reset All',
          role: 'destructive',
          handler: () => {
            clearDatabaseLogs();
            resetSystem();
            presentToast({
              message: 'Database reset to factory default state',
              duration: 2500,
              color: 'medium'
            });
          }
        }
      ]
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>System & QA Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Settings</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Hardware Gateway Mode */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <IonIcon icon={serverOutline} style={{ fontSize: '20px', color: '#38bdf8' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Device Connection Gateway</h2>
            </div>
            
            <IonSegment 
              value={hardwareConfig.mode} 
              onIonChange={(e) => handleModeChange(e.detail.value as any)}
              style={{ background: 'var(--surface-alt)', borderRadius: '10px', marginBottom: '14px' }}
            >
              <IonSegmentButton value="simulation">
                <IonLabel>Demo Simulation</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="hardware">
                <IonLabel>Live ESP32 Board</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {hardwareConfig.mode === 'hardware' && (
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <IonItem lines="none" style={{ '--background': 'transparent', margin: 0 }}>
                  <IonLabel position="stacked" style={{ color: '#38bdf8', fontSize: '12px' }}>
                    ESP32 Local IP Address
                  </IonLabel>
                  <IonInput 
                    value={espIpInput} 
                    placeholder="e.g. 192.168.1.50"
                    onIonInput={(e) => setEspIpInput(e.detail.value!)}
                    style={{ color: '#fff', fontSize: '16px' }}
                  />
                </IonItem>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <IonButton expand="block" size="small" color="primary" onClick={handleSaveHardwareIp} style={{ flex: 1 }}>
                    Save IP
                  </IonButton>
                  <IonButton expand="block" size="small" color="light" onClick={pollDevices} style={{ flex: 1 }}>
                    Ping Test
                  </IonButton>
                </div>
              </div>
            )}
          </div>

          {/* 2. Registered Devices Registry */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <IonIcon icon={hardwareChipOutline} style={{ fontSize: '20px', color: '#10b981' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Hardware Device Registry</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {devices.map((d) => (
                <div key={d.id} style={{ 
                  padding: '12px', 
                  background: 'var(--surface-alt)', 
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text)', fontSize: '14px' }}>{d.name}</strong>
                    <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      MAC: {d.macAddress} • {d.roomLocation}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: d.status === 'active' ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 'bold'
                    }}>
                      ● {d.status.toUpperCase()}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {d.deviceType === 'door_lock' ? (isLocked ? 'Locked' : 'Unlocked') : `${signalStrength}% Signal`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Security & Passkey Management */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '20px', color: '#a855f7' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Security & Passkey</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ color: 'var(--text)', fontSize: '14px', display: 'block' }}>Current Door Passkey</span>
                <small style={{ color: 'var(--text-muted)' }}>Required before door unlock action</small>
              </div>
              <strong style={{ color: '#38bdf8', fontSize: '16px', letterSpacing: '2px' }}>
                {dbService.getAccount().doorPasskeyHash}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton expand="block" color="light" size="small" onClick={handleChangePasskeyPrompt} style={{ flex: 1 }}>
                <IonIcon icon={keyOutline} slot="start" />
                Change PIN
              </IonButton>
              <IonButton expand="block" color="warning" fill="outline" size="small" onClick={handleSimulateFailedAuth} style={{ flex: 1 }}>
                Test Wrong PIN Log
              </IonButton>
            </div>
          </div>

          {/* 4. Complete Software Testing & QA Suite */}
          <div className="card" style={{ border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <IonIcon icon={bugOutline} style={{ fontSize: '22px', color: '#f59e0b' }} />
              <h2 style={{ margin: 0, fontSize: '18px', color: '#f59e0b' }}>Software Testing & QA Suite</h2>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 14px 0' }}>
              Interact with all safety protocols, telemetry triggers, and failsafes for software quality verification.
            </p>

            {/* Quick Climate Injections */}
            <div style={{ marginBottom: '16px' }}>
              <small style={{ color: 'var(--text-dim)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                QUICK TELEMETRY INJECTION
              </small>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <IonButton size="small" color="light" onClick={() => setExactTemperature(18.0)}>
                  <IonIcon icon={snowOutline} slot="start" />
                  Set Cold (18°C)
                </IonButton>
                <IonButton size="small" color="light" onClick={() => setExactTemperature(24.5)}>
                  Set Normal (24.5°C)
                </IonButton>
                <IonButton size="small" color="warning" onClick={() => setExactTemperature(38.0)}>
                  Set High (38°C)
                </IonButton>
                <IonButton size="small" color="danger" onClick={() => setExactHumidity(88)}>
                  Set Humidity (88%)
                </IonButton>
              </div>
            </div>

            {/* Emergency & Hazard Testing */}
            <div style={{ marginBottom: '16px' }}>
              <small style={{ color: 'var(--text-dim)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                EMERGENCY & SAFETY FAILSAFES
              </small>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <IonButton expand="block" color="warning" onClick={() => increaseTemp(10)}>
                  Increase Temp (+10°C)
                </IonButton>
                <IonButton expand="block" color="danger" onClick={simulateSmoke}>
                  <IonIcon icon={flameOutline} slot="start" />
                  Simulate Smoke Detection (MQ-2)
                </IonButton>
                <IonButton expand="block" color="danger" fill="outline" onClick={simulateExtremeHeat}>
                  Simulate Extreme Heat (55°C Spike)
                </IonButton>
                <IonButton expand="block" color="success" onClick={resetSystem}>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Reset Emergency System to Normal
                </IonButton>
              </div>
            </div>

            {/* Database & Mock Data QA */}
            <div>
              <small style={{ color: 'var(--text-dim)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                DATABASE & LOGGING QA
              </small>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <IonButton expand="block" color="secondary" fill="outline" onClick={seedDemoLogs}>
                  <IonIcon icon={sparklesOutline} slot="start" />
                  Seed 10+ Mock Activity Logs
                </IonButton>
                <IonButton expand="block" color="light" onClick={handleExportJson}>
                  <IonIcon icon={cloudDownloadOutline} slot="start" />
                  Export DB JSON Snapshot
                </IonButton>
                <IonButton 
                  expand="block" 
                  color={simulationActive ? "medium" : "success"} 
                  onClick={toggleSimulation}
                >
                  {simulationActive ? 'Pause Background Simulation' : 'Resume Background Simulation'}
                </IonButton>
                <IonButton expand="block" color="danger" fill="clear" onClick={handleFactoryResetPrompt}>
                  Factory Reset Database
                </IonButton>
              </div>
            </div>
          </div>

          {/* 5. System Diagnostics */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Diagnostics & Health</h3>
              <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 'bold' }}>
                Health: {networkHealth}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>
              <span>Latency Ping</span>
              <span style={{ color: 'var(--text)' }}>{latencyMs}ms</span>
            </div>
            <IonButton expand="block" color="light" size="small" onClick={pollDevices}>
              <IonIcon icon={refreshOutline} slot="start" />
              Refresh Diagnostic Ping
            </IonButton>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Settings;

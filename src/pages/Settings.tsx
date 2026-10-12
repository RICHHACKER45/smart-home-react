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
  IonToggle,
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
  serverOutline,
  personCircleOutline,
  logOutOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  timerOutline,
  codeSlashOutline,
  warningOutline
} from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { dbService } from '../services/dbService';
import { probeESP32 } from '../services/hardwareService';

const Settings: React.FC = () => {
  const { 
    currentUser,
    logout,
    doorSessionDurationMinutes,
    setDoorSessionDurationMinutes,
    isDeveloperMode,
    toggleDeveloperMode,
    increaseTemp, 
    setExactTemperature,
    setExactHumidity,
    simulateElevatedHumidity,
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
    hardwareConnected,
    updateHardwareConfig,
    clearDatabaseLogs
  } = useStore();

  const isDeviceConnected = hardwareConnected || simulationActive;
  const [espIpInput, setEspIpInput] = useState<string>(hardwareConfig.esp32Ip);
  const [showPinMask, setShowPinMask] = useState<boolean>(false);
  const [revealedPlainPin, setRevealedPlainPin] = useState<string | null>(null);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const handleLogoutPrompt = () => {
    presentAlert({
      header: 'Confirm Sign Out',
      message: 'Are you sure you want to log out of your account?',
      buttons: [
        'Cancel',
        {
          text: 'Sign Out',
          role: 'destructive',
          handler: () => {
            logout();
            presentToast({
              message: 'Signed out successfully.',
              duration: 2000,
              color: 'medium'
            });
          }
        }
      ]
    });
  };

  const handleChangePasswordPrompt = () => {
    presentAlert({
      header: 'Change Account Password',
      message: 'Enter your new login password.',
      inputs: [
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'New Password (min 6 characters)'
        }
      ],
      buttons: [
        'Cancel',
        {
          text: 'Update Password',
          handler: async (data) => {
            if (data.newPassword && data.newPassword.length >= 6) {
              await dbService.updatePassword(data.newPassword);
              presentToast({
                message: 'Password updated successfully (hashed)!',
                duration: 2500,
                color: 'success'
              });
            } else {
              presentToast({
                message: 'Password must be at least 6 characters.',
                duration: 2500,
                color: 'danger'
              });
            }
          }
        }
      ]
    });
  };

  const handleSaveHardwareIp = async () => {
    const clean = espIpInput.trim();
    if (!clean) {
      presentToast({
        message: 'Please enter a valid IP address (e.g. 192.168.1.50)',
        duration: 2000,
        color: 'danger'
      });
      return;
    }
    updateHardwareConfig({ esp32Ip: clean, mode: 'hardware' });
    presentToast({
      message: `ESP32 IP saved to ${clean}. Polling hardware...`,
      duration: 2500,
      color: 'success'
    });
    // Trigger probe
    const res = await probeESP32(clean);
    if (res.success && res.data) {
      presentToast({
        message: `🟢 Connected to ESP32! Temp: ${res.data.temperature}°C, Hum: ${res.data.humidity}%`,
        duration: 3500,
        color: 'success'
      });
      pollDevices();
    }
  };

  const handlePingTest = async () => {
    const clean = espIpInput.trim();
    if (!clean) {
      presentToast({
        message: 'Please enter an ESP32 IP address first.',
        duration: 2000,
        color: 'warning'
      });
      return;
    }

    presentToast({
      message: `Probing http://${clean}/api/status...`,
      duration: 1500,
      color: 'primary'
    });

    const res = await probeESP32(clean);
    if (res.success && res.data) {
      presentAlert({
        header: '🟢 ESP32 Hardware Online!',
        message: `Successfully connected to ESP32 at ${clean}!\n\n• Temperature: ${res.data.temperature}°C\n• Humidity: ${res.data.humidity}%\n• Door Lock: ${res.data.isLocked ? 'Locked' : 'Unlocked'}\n• Signal Strength: ${res.data.signalStrength}%\n• Uptime: ${res.data.uptimeSeconds}s`,
        buttons: ['Done']
      });
      pollDevices();
    } else {
      presentAlert({
        header: '🔴 ESP32 Connection Failed',
        message: `${res.error || `Could not connect to http://${clean}`}\n\nTroubleshooting Steps:\n1. Verify your PC/Phone is on the SAME Wi-Fi network as the ESP32.\n2. Open http://${clean} in another browser tab to verify if the ESP32 web page loads.\n3. Verify the ESP32 is powered on and assigned ${clean}.`,
        buttons: ['OK']
      });
    }
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
          handler: async (data) => {
            if (data.newPin && data.newPin.length === 4) {
              await dbService.updatePasskey(data.newPin);
              setRevealedPlainPin(data.newPin);
              presentToast({
                message: `Passkey updated to: ${data.newPin} (hashed securely)`,
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

  const handleTogglePinVisibility = () => {
    if (!showPinMask) {
      // If we don't have the plain PIN in state, prompt for verification
      if (!revealedPlainPin) {
        presentAlert({
          header: 'Verify Current Passkey',
          message: 'Enter your 4-digit PIN to reveal it.',
          inputs: [
            {
              name: 'verifyPin',
              type: 'password',
              placeholder: 'Enter 4-digit PIN',
              attributes: { maxlength: 4, inputmode: 'numeric' }
            }
          ],
          buttons: [
            'Cancel',
            {
              text: 'Verify',
              handler: async (data) => {
                if (data.verifyPin) {
                  const isValid = await dbService.verifyPasskey(data.verifyPin);
                  if (isValid) {
                    setRevealedPlainPin(data.verifyPin);
                    setShowPinMask(true);
                  } else {
                    presentToast({
                      message: 'Incorrect PIN entered.',
                      duration: 2000,
                      color: 'danger'
                    });
                  }
                }
              }
            }
          ]
        });
      } else {
        setShowPinMask(true);
      }
    } else {
      setShowPinMask(false);
    }
  };

  const handleToggleDeveloperMode = (e: CustomEvent) => {
    const shouldEnable = e.detail.checked;
    if (shouldEnable) {
      presentAlert({
        header: '⚠️ Enable Developer Mode?',
        message: 'You are entering Developer & QA Mode. This exposes low-level IoT hardware gateways, database manipulation tools, and telemetry simulators. Are you sure you want to proceed?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              toggleDeveloperMode(false);
            }
          },
          {
            text: 'Enable Dev Mode',
            handler: () => {
              toggleDeveloperMode(true);
              presentToast({
                message: 'Developer Mode Enabled',
                duration: 2000,
                color: 'warning'
              });
            }
          }
        ]
      });
    } else {
      toggleDeveloperMode(false);
      presentToast({
        message: 'Developer Mode Disabled',
        duration: 1500,
        color: 'medium'
      });
    }
  };

  const handleSimulateFailedAuth = () => {
    const actor = currentUser ? currentUser.username : 'Intruder';
    dbService.logActivity(actor, 'AUTH', 'Failed door unlock attempt - Invalid PIN entered (QA Test)', 'FAILED');
    presentToast({
      message: 'Simulated Security Alert: Failed passkey logged to Activity tab',
      duration: 2500,
      color: 'warning'
    });
  };

  const handleExportJson = () => {
    const jsonStr = dbService.exportDatabaseJson();
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
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Settings</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Logged-in Account Profile */}
          <div className="card" style={{ border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.05))',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IonIcon icon={personCircleOutline} style={{ fontSize: '30px', color: '#38bdf8' }} />
                </div>
                <div>
                  <strong style={{ fontSize: '16px', color: '#fff', display: 'block' }}>
                    {currentUser?.username || 'User'}
                  </strong>
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {currentUser?.email || 'user@smarthome.local'}
                  </small>
                </div>
              </div>

              <span style={{ 
                fontSize: '11px', 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: '#10b981', 
                padding: '4px 8px', 
                borderRadius: '8px',
                fontWeight: 'bold'
              }}>
                Active Account
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton expand="block" size="small" color="light" fill="outline" onClick={handleChangePasswordPrompt} style={{ flex: 1 }}>
                <IonIcon icon={lockClosedOutline} slot="start" />
                Change Password
              </IonButton>
              <IonButton expand="block" size="small" color="danger" fill="outline" onClick={handleLogoutPrompt} style={{ flex: 1 }}>
                <IonIcon icon={logOutOutline} slot="start" />
                Sign Out
              </IonButton>
            </div>
          </div>

          {/* 2. Security & Door Passkey Management */}
          <div className="card" style={{
            opacity: isDeviceConnected ? 1 : 0.6,
            transition: 'all 0.3s ease',
            border: !isDeviceConnected ? '1px dashed rgba(148, 163, 184, 0.3)' : undefined
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '20px', color: '#a855f7' }} />
                <h2 style={{ margin: 0, fontSize: '18px' }}>Door Security Passkey</h2>
              </div>
              {!isDeviceConnected && (
                <span style={{ 
                  fontSize: '11px', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#f87171', 
                  padding: '3px 8px', 
                  borderRadius: '8px',
                  fontWeight: '600'
                }}>
                  Offline
                </span>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'var(--surface-alt)', 
              padding: '12px 14px', 
              borderRadius: '10px', 
              marginBottom: '14px' 
            }}>
              <div>
                <span style={{ color: 'var(--text)', fontSize: '14px', display: 'block', fontWeight: '500' }}>Door Security PIN</span>
                <small style={{ color: 'var(--text-muted)' }}>4-digit code required to unlock the door</small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ 
                  color: '#38bdf8', 
                  fontSize: '18px', 
                  letterSpacing: '3px',
                  fontFamily: 'monospace'
                }}>
                  {showPinMask ? (revealedPlainPin || '••••') : '••••'}
                </strong>
                <button 
                  onClick={handleTogglePinVisibility}
                  disabled={!isDeviceConnected}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: isDeviceConnected ? 'pointer' : 'not-allowed',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  aria-label={showPinMask ? 'Hide PIN' : 'Reveal PIN'}
                >
                  <IonIcon icon={showPinMask ? eyeOffOutline : eyeOutline} style={{ fontSize: '18px' }} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton 
                expand="block" 
                color="light" 
                size="small" 
                onClick={handleChangePasskeyPrompt} 
                disabled={!isDeviceConnected}
                style={{ flex: 1 }}
              >
                <IonIcon icon={keyOutline} slot="start" />
                {isDeviceConnected ? 'Change 4-Digit PIN' : 'Door Offline (Controls Locked)'}
              </IonButton>
            </div>
          </div>

          {/* 3. Door Authorization Duration Settings */}
          <div className="card" style={{
            opacity: isDeviceConnected ? 1 : 0.6,
            transition: 'all 0.3s ease',
            border: !isDeviceConnected ? '1px dashed rgba(148, 163, 184, 0.3)' : undefined
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <IonIcon icon={timerOutline} style={{ fontSize: '20px', color: '#38bdf8' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Passkey Session Timeout</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 12px 0' }}>
              How long the door remains authorized after entering your 4-digit PIN before requiring it again.
            </p>

            <IonSegment 
              value={doorSessionDurationMinutes.toString()} 
              disabled={!isDeviceConnected}
              onIonChange={(e) => setDoorSessionDurationMinutes(parseInt(e.detail.value as string, 10))}
              style={{ background: 'var(--surface-alt)', borderRadius: '10px' }}
            >
              <IonSegmentButton value="15">
                <IonLabel>15 Mins</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="30">
                <IonLabel>30 Mins</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="60">
                <IonLabel>1 Hour</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {/* 4. Registered Devices Registry */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={hardwareChipOutline} style={{ fontSize: '20px', color: '#10b981' }} />
                <h2 style={{ margin: 0, fontSize: '18px' }}>Registered Devices</h2>
              </div>
              <span style={{ 
                fontSize: '11px', 
                color: isDeviceConnected && devices.length > 0 ? 'var(--success)' : 'var(--text-dim)', 
                fontWeight: '600' 
              }}>
                {isDeviceConnected && devices.length > 0 ? `${devices.length} Online` : '0 Connected'}
              </span>
            </div>

            {(!isDeviceConnected || devices.length === 0) ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '24px 16px', 
                background: 'var(--surface-alt)', 
                borderRadius: '10px',
                border: '1px dashed rgba(148, 163, 184, 0.25)'
              }}>
                <IonIcon icon={hardwareChipOutline} style={{ fontSize: '32px', color: 'var(--text-dim)', marginBottom: '8px' }} />
                <strong style={{ display: 'block', color: 'var(--text-dim)', fontSize: '14px' }}>
                  No Connected Devices Detected
                </strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '6px 0 0 0' }}>
                  Connect to ESP32 Wi-Fi Hub or enable Demo Simulation in Developer Mode to register and monitor smart devices.
                </p>
              </div>
            ) : (
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
            )}
          </div>

          {/* 5. Developer Mode Toggle Card */}
          <div className="card" style={{ border: isDeveloperMode ? '1px solid rgba(245, 158, 11, 0.4)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={codeSlashOutline} style={{ fontSize: '22px', color: isDeveloperMode ? '#f59e0b' : 'var(--text-muted)' }} />
                <div>
                  <strong style={{ fontSize: '15px', color: isDeveloperMode ? '#f59e0b' : 'var(--text)' }}>
                    Developer & QA Mode
                  </strong>
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>
                    Reveal hardware gateways, telemetry simulators, & QA tools
                  </small>
                </div>
              </div>
              <IonToggle 
                checked={isDeveloperMode} 
                onIonChange={handleToggleDeveloperMode}
                color="warning"
              />
            </div>
          </div>

          {/* ================= GATED DEVELOPER MODE TOOLS ================= */}
          {isDeveloperMode && (
            <>
              {/* Developer Notice Banner */}
              <div style={{ 
                background: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid rgba(245, 158, 11, 0.3)', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px' 
              }}>
                <IonIcon icon={warningOutline} style={{ fontSize: '22px', color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#fcd34d' }}>
                  <strong>Developer Mode Active:</strong> Low-level IoT gateway, simulation toggles, and QA controls are exposed below.
                </span>
              </div>

              {/* Simulation / Demo Mode Toggle Card */}
              <div className="card" style={{ 
                border: simulationActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.3)',
                background: simulationActive ? 'rgba(16, 185, 129, 0.05)' : undefined
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IonIcon icon={sparklesOutline} style={{ fontSize: '22px', color: simulationActive ? '#10b981' : 'var(--text-muted)' }} />
                    <div>
                      <strong style={{ fontSize: '15px', color: simulationActive ? '#10b981' : 'var(--text)' }}>
                        Demo / Simulation Mode
                      </strong>
                      <small style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>
                        {simulationActive ? 'Simulating virtual telemetry & smart devices' : 'Disabled — Real hardware required'}
                      </small>
                    </div>
                  </div>
                  <IonToggle 
                    checked={simulationActive} 
                    onIonChange={toggleSimulation}
                    color="success"
                  />
                </div>
              </div>

              {/* Hardware Gateway Mode */}
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

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <IonButton 
                    expand="block" 
                    size="small" 
                    color="secondary" 
                    fill="outline"
                    style={{ flex: 1 }}
                    onClick={async () => {
                      const { supabaseApi } = await import('../services/supabaseClient');
                      const res = await supabaseApi.testConnection();
                      presentToast({
                        message: res.success ? '🟢 Supabase Cloud: Online & Connected' : `🔴 Supabase Cloud: ${res.message}`,
                        duration: 3000,
                        color: res.success ? 'success' : 'danger'
                      });
                    }}
                  >
                    <IonIcon icon={cloudDownloadOutline} slot="start" />
                    Test Supabase Cloud
                  </IonButton>
                </div>

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
                      <IonButton expand="block" size="small" color="light" onClick={handlePingTest} style={{ flex: 1 }}>
                        Ping Test
                      </IonButton>
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Software Testing & QA Suite */}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <IonButton expand="block" color="warning" fill="outline" size="small" onClick={() => simulateElevatedHumidity(65)}>
                        Warn Humid (65%)
                      </IonButton>
                      <IonButton expand="block" color="warning" size="small" onClick={() => simulateElevatedHumidity(75)}>
                        High Humid (75%)
                      </IonButton>
                    </div>
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
                    <IonButton expand="block" color="warning" fill="outline" size="small" onClick={handleSimulateFailedAuth}>
                      Test Failed Auth Log
                    </IonButton>
                    <IonButton expand="block" color="light" onClick={handleExportJson}>
                      <IonIcon icon={cloudDownloadOutline} slot="start" />
                      Export DB JSON Snapshot
                    </IonButton>
                    <IonButton expand="block" color="danger" fill="clear" onClick={handleFactoryResetPrompt}>
                      Factory Reset Database
                    </IonButton>
                  </div>
                </div>
              </div>

              {/* System Diagnostics */}
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
            </>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Settings;

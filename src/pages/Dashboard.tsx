import React, { useState, useEffect } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon } from '@ionic/react';
import { lockClosed, lockOpen, keyOutline, warningOutline, timeOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { PasskeyModal } from '../components/PasskeyModal';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import './Dashboard.css';

const playDoorSound = (isUnlocking: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (isUnlocking) {
      // Unlocking: Two ascending tones
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Locking: Deep mechanical click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error('AudioContext error:', e);
  }
};

const Dashboard: React.FC = () => {
  const { 
    isLocked, 
    isDoorAuthorized,
    doorAuthExpiresAt,
    temperature, 
    humidity, 
    isAlarming, 
    isPasskeyModalOpen,
    openPasskeyModal,
    closePasskeyModal,
    executeAuthenticatedDoorToggle,
    toggleLock,
    revokeDoorAuthorization
  } = useStore();

  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      if (isDoorAuthorized && doorAuthExpiresAt) {
        const diffMs = doorAuthExpiresAt - Date.now();
        if (diffMs > 0) {
          setRemainingMinutes(Math.ceil(diffMs / (60 * 1000)));
        } else {
          setRemainingMinutes(0);
          revokeDoorAuthorization();
        }
      } else {
        setRemainingMinutes(0);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 5000);
    return () => clearInterval(interval);
  }, [isDoorAuthorized, doorAuthExpiresAt, revokeDoorAuthorization]);

  const isSessionActive = isDoorAuthorized && remainingMinutes > 0;

  const handleDoorToggleAction = async () => {
    if (isAlarming) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}

    if (!isLocked) {
      // Direct lock
      playDoorSound(false);
      await toggleLock();
    } else if (isSessionActive) {
      // Direct unlock via active session
      playDoorSound(true);
      await toggleLock();
    } else {
      // Require Passkey
      openPasskeyModal();
    }
  };

  const handlePasskeySuccess = async () => {
    playDoorSound(isLocked);
    await executeAuthenticatedDoorToggle();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Dashboard</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '20px' }}>
          {/* Emergency Alert Card */}
          {isAlarming && (
            <div className="card" style={{ border: '2px solid var(--danger)', backgroundColor: 'rgba(244, 63, 94, 0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={warningOutline} style={{ fontSize: '28px', color: 'var(--danger)' }} />
                <div>
                  <h2 style={{ color: 'var(--danger)', margin: 0, fontSize: '18px' }}>🚨 EMERGENCY ALARM ACTIVE</h2>
                  <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Smoke or extreme heat detected! Door failsafe has automatically unlocked for safety.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Door Status Card with Security Passkey Badge */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Front Door Security</h2>
              
              {isSessionActive ? (
                <span style={{ 
                  fontSize: '11px', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: '#10b981', 
                  padding: '4px 10px', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: '600'
                }}>
                  <IonIcon icon={checkmarkCircleOutline} /> Authorized ({remainingMinutes}m left)
                </span>
              ) : (
                <span style={{ 
                  fontSize: '11px', 
                  background: 'rgba(56, 189, 248, 0.15)', 
                  color: '#38bdf8', 
                  padding: '4px 8px', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <IonIcon icon={keyOutline} /> Passkey Protected
                </span>
              )}
            </div>

            <div className="door-container">
              <div className="door-frame" onClick={handleDoorToggleAction} style={{ cursor: 'pointer' }}>
                <div className={`door-panel ${!isLocked ? 'unlocked' : ''}`}>
                  <div className="door-knob"></div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: isLocked ? 'var(--success)' : 'var(--warning)', 
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                <IonIcon icon={isLocked ? lockClosed : lockOpen} />
                {isLocked ? 'SECURELY LOCKED' : 'UNLOCKED'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '18px' }}>
              <IonButton 
                expand="block" 
                color={isLocked ? "primary" : "warning"}
                onClick={handleDoorToggleAction}
                disabled={isAlarming}
                style={{ '--border-radius': '12px', margin: 0 }}
              >
                <IonIcon icon={isLocked ? lockOpen : lockClosed} slot="start" />
                {isLocked 
                  ? (isSessionActive ? 'Unlock Door' : 'Unlock with Passkey')
                  : 'Lock Door'
                }
              </IonButton>

              {isSessionActive && (
                <IonButton
                  expand="block"
                  fill="clear"
                  size="small"
                  color="medium"
                  onClick={() => {
                    revokeDoorAuthorization();
                    if (!isLocked) {
                      playDoorSound(false);
                      toggleLock();
                    }
                  }}
                  style={{ margin: 0, fontSize: '12px' }}
                >
                  <IonIcon icon={timeOutline} slot="start" />
                  Lock & Expire Authorization Session
                </IonButton>
              )}
            </div>
          </div>

          {/* Climate Telemetry Cards */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="mini-card" style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--text-dim)', margin: '0 0 10px 0', fontSize: '13px' }}>Temperature</h3>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: temperature >= 45 ? 'var(--danger)' : 'var(--text)' }}>
                {temperature}°C
              </div>
            </div>
            <div className="mini-card" style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--text-dim)', margin: '0 0 10px 0', fontSize: '13px' }}>Humidity</h3>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--accent)' }}>
                {humidity}%
              </div>
            </div>
          </div>
        </div>

        {/* Security Passkey Entry Modal */}
        <PasskeyModal
          isOpen={isPasskeyModalOpen}
          onClose={closePasskeyModal}
          onSuccess={handlePasskeySuccess}
          targetActionName="Door Unlock"
        />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

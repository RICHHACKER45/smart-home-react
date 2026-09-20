import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon } from '@ionic/react';
import { lockClosed, lockOpen, keyOutline, warningOutline } from 'ionicons/icons';
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
    temperature, 
    humidity, 
    isAlarming, 
    isPasskeyModalOpen,
    openPasskeyModal,
    closePasskeyModal,
    executeAuthenticatedDoorToggle 
  } = useStore();

  const handleDoorPrompt = async () => {
    if (isAlarming) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    openPasskeyModal();
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
            </div>

            <div className="door-container">
              <div className="door-frame" onClick={handleDoorPrompt} style={{ cursor: 'pointer' }}>
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

            <IonButton 
              expand="block" 
              color={isLocked ? "primary" : "warning"}
              onClick={handleDoorPrompt}
              disabled={isAlarming}
              style={{ '--border-radius': '12px', marginTop: '18px' }}
            >
              <IonIcon icon={isLocked ? lockOpen : lockClosed} slot="start" />
              {isLocked ? 'Unlock with Passkey' : 'Lock with Passkey'}
            </IonButton>
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
          targetActionName={isLocked ? 'Door Unlock' : 'Door Lock'}
        />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

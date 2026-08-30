import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
import { useStore } from '../store/useStore';
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
      // Unlocking: Two quick ascending tones
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Locking: Heavy thud
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
  const { isLocked, temperature, humidity, isAlarming, toggleLock } = useStore();

  const handleDoorInteraction = async () => {
    if (isAlarming) return;
    
    // Trigger medium physical haptic bump
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}

    // Play synthesized mechanical sound based on the new state
    playDoorSound(isLocked); // if it WAS locked, we are unlocking

    // Actually toggle the state
    toggleLock();
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
          {isAlarming && (
            <div className="card" style={{ border: '1px solid var(--danger)', backgroundColor: 'var(--surface)' }}>
              <h2 style={{ color: 'var(--danger)', marginTop: 0 }}>🚨 EMERGENCY ALARM</h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: 0 }}>Smoke or extreme temperature detected! Door has been forcefully unlocked.</p>
            </div>
          )}

          <div className="card">
            <h2>Door Status</h2>
            <div className="door-container">
              <div className="door-frame" onClick={handleDoorInteraction} style={{ cursor: 'pointer' }}>
                <div className={`door-panel ${!isLocked ? 'unlocked' : ''}`}>
                  <div className="door-knob"></div>
                </div>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: isLocked ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
              {isLocked ? 'LOCKED' : 'UNLOCKED'}
            </p>
            <IonButton 
              expand="block" 
              color={isLocked ? "medium" : "primary"}
              onClick={handleDoorInteraction}
              disabled={isAlarming}
              style={{ '--border-radius': '8px', marginTop: '16px' }}
            >
              {isLocked ? 'Unlock Door' : 'Lock Door'}
            </IonButton>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="mini-card" style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--text-dim)', margin: '0 0 10px 0', fontSize: '14px' }}>Temperature</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: temperature >= 45 ? 'var(--danger)' : 'var(--text)' }}>
                {temperature}°C
              </div>
            </div>
            <div className="mini-card" style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--text-dim)', margin: '0 0 10px 0', fontSize: '14px' }}>Humidity</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {humidity}%
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;

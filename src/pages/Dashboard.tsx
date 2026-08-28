import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useStore } from '../store/useStore';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { isLocked, temperature, humidity, isAlarming } = useStore();

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
              <div className="door-frame">
                <div className={`door-panel ${!isLocked ? 'unlocked' : ''}`}>
                  <div className="door-knob"></div>
                </div>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: isLocked ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
              {isLocked ? 'LOCKED' : 'UNLOCKED'}
            </p>
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

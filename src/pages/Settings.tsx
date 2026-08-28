import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
import { useStore } from '../store/useStore';

const Settings: React.FC = () => {
  const { 
    increaseTemp, simulateSmoke, resetSystem, simulationActive, toggleSimulation,
    signalStrength, networkHealth, latencyMs, isLocked, pollDevices 
  } = useStore();

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
        
        <div style={{ padding: '20px' }}>
          {/* Linked Devices Section */}
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Linked Devices</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text)' }}>Front Door Lock</strong>
                  <small style={{ color: 'var(--text-muted)' }}>{isLocked ? 'Connected' : 'Unlocked/Alert'}</small>
                </div>
                <div style={{ color: 'var(--success)' }}>Online</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text)' }}>Room Sensor</strong>
                  <small style={{ color: 'var(--text-muted)' }}>Excellent Signal</small>
                </div>
                <div style={{ color: 'var(--success)' }}>{signalStrength}%</div>
              </div>
            </div>
          </div>

          {/* System Info Section */}
          <div className="card">
            <h2 style={{ marginTop: 0 }}>System Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: 'var(--text-muted)' }}>Network Health</small>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {networkHealth > 90 ? 'Excellent' : 'Stable'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: 'var(--text-muted)' }}>Latency</small>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{latencyMs}ms ping</strong>
              </div>
            </div>
            <IonButton 
              expand="block" 
              color="light" 
              onClick={pollDevices} 
              style={{ '--border-radius': '8px', marginTop: '15px' }}
            >
              Refresh Connection
            </IonButton>
          </div>


          <div className="card">
            <h2 style={{ marginTop: 0 }}>Developer Simulator</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              <IonButton 
                expand="block" 
                color="warning" 
                onClick={() => increaseTemp(10)}
                style={{ '--border-radius': '8px' }}
              >
                Increase Temp (+10)
              </IonButton>
              
              <IonButton 
                expand="block" 
                color="danger" 
                onClick={() => simulateSmoke()}
                style={{ '--border-radius': '8px' }}
              >
                Simulate Smoke
              </IonButton>
              
              <IonButton 
                expand="block" 
                color="medium" 
                onClick={() => resetSystem()}
                style={{ '--border-radius': '8px' }}
              >
                Reset System
              </IonButton>

              <div style={{ margin: '20px 0', borderTop: '1px solid var(--border)' }}></div>

              <IonButton 
                expand="block" 
                color={simulationActive ? "success" : "light"} 
                onClick={() => toggleSimulation()}
                style={{ '--border-radius': '8px' }}
              >
                {simulationActive ? 'Disable Data Simulation' : 'Enable Data Simulation'}
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Settings;

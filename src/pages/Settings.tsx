import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
import { useStore } from '../store/useStore';

const Settings: React.FC = () => {
  const { increaseTemp, simulateSmoke, resetSystem, simulationActive, toggleSimulation } = useStore();

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

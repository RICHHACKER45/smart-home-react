import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useStore } from '../store/useStore';

const Activity: React.FC = () => {
  const { logs } = useStore();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Activity Logs</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Activity Logs</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '20px' }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>System Logs</h2>
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recent activity.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ 
                    padding: '12px', 
                    background: 'var(--surface-alt)', 
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--accent)'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {log.time}
                    </div>
                    <div style={{ color: 'var(--text)' }}>
                      {log.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Activity;

import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useStore } from '../store/useStore';

const Climate: React.FC = () => {
  const { temperatureHistory } = useStore();

  const data = temperatureHistory.map((temp, index) => ({
    time: `T-${11 - index}`, // e.g., T-11 to T-0
    temp
  }));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Climate</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Climate</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '20px' }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Temperature History</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data}>
                  <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={12} />
                  <YAxis stroke="var(--text-dim)" domain={['dataMin - 2', 'dataMax + 2']} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Bar dataKey="temp" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.temp > 45 ? 'var(--danger)' : 'var(--accent)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Climate;

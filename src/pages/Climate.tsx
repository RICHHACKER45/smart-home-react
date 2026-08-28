import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useStore } from '../store/useStore';

const Climate: React.FC = () => {
  const { temperatureHistory, temperature } = useStore();

  const getAdvice = () => {
    if (temperature >= 60) return "🌋 EXTREME HEAT: Immediate danger!";
    if (temperature >= 45) return "⚠️ EMERGENCY: Safety protocol engaged.";
    if (temperature >= 40) return "🔥 CRITICAL: High temperature.";
    if (temperature >= 30) return "🌡️ WARNING: Room is getting warm.";
    if (temperature < 23) return "❄️ COOL: Room temperature is low.";
    return "✅ Environment is within target range.";
  };

  const getAdviceColor = () => {
    if (temperature >= 45) return 'var(--danger)';
    if (temperature >= 30) return 'var(--warning)';
    return 'var(--text-dim)';
  };

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
          <div className="card" style={{ marginTop: '20px' }}>
            <h2>System Advice</h2>
            <p style={{ color: getAdviceColor(), fontWeight: 'bold' }}>
              {getAdvice()}
            </p>
          </div>

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

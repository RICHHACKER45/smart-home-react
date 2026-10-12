import React, { useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonIcon, 
  IonButton,
  IonBadge,
  IonSpinner
} from '@ionic/react';
import { 
  refreshOutline, 
  thermometerOutline, 
  speedometerOutline, 
  waterOutline, 
  statsChartOutline,
  trendingUpOutline,
  trendingDownOutline,
  shieldCheckmarkOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useStore } from '../store/useStore';

const Analytics: React.FC = () => {
  const { 
    temperatureHistory, 
    temperature, 
    humidity, 
    gasValue, 
    gasThreshold, 
    pollDevices, 
    hardwareConnected, 
    simulationActive,
    hardwareConfig 
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await pollDevices();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const chartData = temperatureHistory.map((temp, index) => ({
    time: `T-${11 - index}`,
    temp
  }));

  const validTemps = temperatureHistory.filter(t => t > 0);
  const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : temperature;
  const minTemp = validTemps.length > 0 ? Math.min(...validTemps) : temperature;
  const avgTemp = validTemps.length > 0 
    ? (validTemps.reduce((acc, t) => acc + t, 0) / validTemps.length).toFixed(1) 
    : temperature.toFixed(1);

  const isOnline = hardwareConnected || simulationActive;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Telemetry Analytics</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Telemetry Analytics</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div style={{ padding: '16px', maxWidth: '720px', margin: '0 auto' }}>
          
          {/* Header Sync Status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={statsChartOutline} style={{ fontSize: '18px', color: 'var(--accent)' }} />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>
                  Environmental Telemetry History
                </h2>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
                {isOnline ? 'Real-time telemetry logging (12-interval rolling window)' : 'Offline • Awaiting hardware sync'}
              </p>
            </div>

            <IonButton 
              size="small" 
              fill="outline" 
              color="primary"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <IonSpinner name="dots" style={{ width: '16px', height: '16px' }} />
              ) : (
                <>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Refresh
                </>
              )}
            </IonButton>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginBottom: '16px'
          }}>
            {/* Current */}
            <div className="card" style={{ margin: 0, padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Current Temp
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginTop: '2px' }}>
                {isOnline ? `${temperature.toFixed(1)}°C` : '--'}
              </div>
              <div style={{ fontSize: '10px', color: temperature >= 40 ? 'var(--danger)' : 'var(--success)', marginTop: '2px' }}>
                {temperature >= 40 ? 'Critical Heat' : 'Within Limits'}
              </div>
            </div>

            {/* Peak */}
            <div className="card" style={{ margin: 0, padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Peak High
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: maxTemp >= 40 ? 'var(--danger)' : 'var(--warning)', marginTop: '2px' }}>
                {isOnline ? `${maxTemp.toFixed(1)}°C` : '--'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                Safety Limit: 40.0°C
              </div>
            </div>

            {/* Lowest */}
            <div className="card" style={{ margin: 0, padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Lowest Temp
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)', marginTop: '2px' }}>
                {isOnline ? `${minTemp.toFixed(1)}°C` : '--'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                Baseline Check
              </div>
            </div>

            {/* Average */}
            <div className="card" style={{ margin: 0, padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Average Temp
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginTop: '2px' }}>
                {isOnline ? `${avgTemp}°C` : '--'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                Mean Calculation
              </div>
            </div>
          </div>

          {/* DEDICATED BAR CHART CARD */}
          <div className="card" style={{ marginBottom: '16px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text)' }}>
                  Temperature Telemetry Trend
                </h3>
                <small style={{ color: 'var(--text-dim)' }}>
                  Rolling 12-tick sensor sampling history
                </small>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <IonBadge color="primary" style={{ fontSize: '10px' }}>Normal &lt;30°C</IonBadge>
                <IonBadge color="warning" style={{ fontSize: '10px' }}>Warm ≥30°C</IonBadge>
                <IonBadge color="danger" style={{ fontSize: '10px' }}>Critical ≥40°C</IonBadge>
              </div>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" domain={['dataMin - 2', 'dataMax + 2']} fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-alt)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '10px',
                      color: 'var(--text)'
                    }}
                    itemStyle={{ color: 'var(--text)' }}
                    formatter={(val: any) => [`${val}°C`, 'Temperature']}
                  />
                  <Bar dataKey="temp" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.temp >= 40 ? 'var(--danger)' : (entry.temp >= 30 ? 'var(--warning)' : 'var(--accent)')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid var(--border)',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              <span>T-11 (Earliest sampled tick)</span>
              <span>T-0 (Latest live sample)</span>
            </div>
          </div>

          {/* SENSOR HEALTH & THRESHOLD ANALYSIS */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold' }}>
              Sensor Safety Benchmarks
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={thermometerOutline} style={{ color: 'var(--danger)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>Critical Heat Threshold</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>
                  40.0°C <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(Current: {temperature.toFixed(1)}°C)</span>
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={waterOutline} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>Relative Humidity Advisory</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>
                  60.0% RH <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(Current: {humidity}%)</span>
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={speedometerOutline} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>MQ-2 Gas Alarm Threshold</span>
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text)' }}>
                  {gasThreshold} ADC <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(Current: {gasValue} ADC)</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Analytics;

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
  flameOutline, 
  waterOutline, 
  thermometerOutline, 
  speedometerOutline,
  shieldCheckmarkOutline, 
  lockOpenOutline, 
  pulseOutline,
  statsChartOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { useStore } from '../store/useStore';

const Climate: React.FC = () => {
  const { 
    temperature, 
    humidity,
    gasValue,
    gasThreshold,
    smokeActive,
    isAlarming,
    hardwareConnected, 
    hardwareConfig,
    simulationActive,
    pollDevices,
    resetSystem
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await pollDevices();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const isOnline = hardwareConnected || simulationActive;
  const isSmokeOrGasActive = smokeActive || (gasValue > 0 && gasValue >= gasThreshold) || (isAlarming && smokeActive);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Climate & Environment</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Climate & Environment</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '16px', maxWidth: '720px', margin: '0 auto' }}>

          {/* Sync Header Status Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '10px 14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isOnline ? 'var(--success)' : 'var(--text-dim)',
                boxShadow: isOnline ? '0 0 8px var(--success)' : 'none'
              }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>
                  {hardwareConnected 
                    ? `Live ESP32 Gateway (${hardwareConfig.esp32Ip})`
                    : (simulationActive ? 'Simulation Engine Telemetry' : 'Hardware Disconnected')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {isOnline ? 'Real-time sensor telemetry synchronized' : 'Offline • Values at baseline'}
                </div>
              </div>
            </div>

            <IonButton 
              size="small" 
              fill="outline" 
              color={isOnline ? 'primary' : 'medium'}
              onClick={handleManualSync}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <IonSpinner name="dots" style={{ width: '18px', height: '18px' }} />
              ) : (
                <>
                  <IonIcon icon={refreshOutline} slot="start" />
                  Sync
                </>
              )}
            </IonButton>
          </div>

          {/* 1. SYNCHRONIZED SMOKE & GAS HAZARD CARD (Appears when Smoke/Gas Detected or Alarming) */}
          {isSmokeOrGasActive && (
            <div className="card" style={{
              border: '2px solid var(--danger)',
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.22), rgba(244, 63, 94, 0.08))',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(244, 63, 94, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <IonIcon icon={flameOutline} style={{ fontSize: '28px', color: 'var(--danger)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '17px', fontWeight: 'bold' }}>
                      🚨 SMOKE / GAS ALARM SYNCHRONIZED
                    </h3>
                    <IonBadge color="danger">HAZARD MEASURED</IonBadge>
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>
                    MQ-2 sensor telemetry actively detecting elevated airborne smoke / combustible gas!
                  </small>
                </div>
              </div>

              {/* Synchronized Measurement Details */}
              <div style={{ 
                background: 'rgba(15, 27, 45, 0.75)', 
                borderRadius: '12px', 
                padding: '12px', 
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    MQ-2 Gas Level Reading
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--danger)', marginTop: '2px' }}>
                    {gasValue} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ADC</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Safety Threshold: {gasThreshold} ADC
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Air Hazard Ratio
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '2px' }}>
                    {gasThreshold > 0 ? Math.round((gasValue / gasThreshold) * 100) : 100}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Limit Exceeded: +{Math.max(0, gasValue - gasThreshold)} ADC
                  </div>
                </div>
              </div>

              {/* Safety Action Status */}
              <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '12px', lineHeight: '1.4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <IonIcon icon={lockOpenOutline} />
                  <span><strong>Egress Protocol:</strong> Door lock automatically disengaged for safe egress.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', marginTop: '4px' }}>
                  <IonIcon icon={pulseOutline} />
                  <span><strong>Siren Alert:</strong> Active 5V hardware buzzer pulsing urgent alarm pattern.</span>
                </div>
              </div>

              <IonButton expand="block" color="success" size="small" onClick={resetSystem}>
                <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                Reset Emergency System & Silence Alarm
              </IonButton>
            </div>
          )}

          {/* 2. DEDICATED ELEVATED HUMIDITY WARNING CARD (Warn, not alarm - triggers at >= 60% or >= 70%) */}
          {humidity >= 60 && (
            <div className="card" style={{
              border: humidity >= 70 ? '2px solid var(--warning)' : '1.5px solid var(--warning)',
              background: 'rgba(245, 158, 11, 0.1)',
              marginBottom: '16px',
              borderRadius: '14px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <IonIcon icon={waterOutline} style={{ fontSize: '24px', color: 'var(--warning)', marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--warning)', fontSize: '15px', fontWeight: 'bold' }}>
                      {humidity >= 70 ? '⚠️ High Indoor Humidity Warning' : '⚠️ Elevated Humidity Advisory'}
                    </h4>
                    <IonBadge color="warning">{humidity}% RH</IonBadge>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 6px 0', fontSize: '12px', lineHeight: '1.4' }}>
                    {humidity >= 70 
                      ? 'Heavy moisture detected. Risk of condensation, mold spores, and mildew buildup. Recommend activating AC Dry Mode or ventilation.'
                      : 'Indoor humidity is above optimal comfort range (30% - 55%). Ensure ventilation or fan circulation.'}
                  </p>
                  <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    ℹ️ Advisory warning only. Emergency siren and door lock remain normal.
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* 3. THE 3 TELEMETRY METRIC CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Card 1: Temperature */}
            <div className="card" style={{ margin: 0, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Temperature
                </span>
                <IonIcon icon={thermometerOutline} style={{ color: temperature >= 40 ? 'var(--danger)' : (temperature >= 30 ? 'var(--warning)' : 'var(--accent)') }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>
                {isOnline ? `${temperature.toFixed(1)}°C` : '--'}
              </div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonBadge color={temperature >= 40 ? 'danger' : (temperature >= 30 ? 'warning' : 'success')} style={{ fontSize: '10px' }}>
                  {temperature >= 40 ? 'CRITICAL HEAT' : (temperature >= 30 ? 'WARM' : (temperature < 21 ? 'COOL' : 'COMFORTABLE'))}
                </IonBadge>
                <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Limit: 40.0°C</small>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, (temperature / 50) * 100))}%`,
                  height: '100%',
                  background: temperature >= 40 ? 'var(--danger)' : (temperature >= 30 ? 'var(--warning)' : 'var(--accent)'),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Card 2: Relative Humidity */}
            <div className="card" style={{ margin: 0, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Relative Humidity
                </span>
                <IonIcon icon={waterOutline} style={{ color: humidity >= 70 ? 'var(--danger)' : (humidity >= 60 ? 'var(--warning)' : 'var(--accent)') }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>
                {isOnline ? `${humidity}%` : '--'}
              </div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonBadge color={humidity >= 70 ? 'danger' : (humidity >= 60 ? 'warning' : 'success')} style={{ fontSize: '10px' }}>
                  {humidity >= 70 ? 'HIGH (≥70%)' : (humidity >= 60 ? 'ELEVATED (≥60%)' : 'OPTIMAL (30-55%)')}
                </IonBadge>
                <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Target: 45%</small>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, humidity))}%`,
                  height: '100%',
                  background: humidity >= 70 ? 'var(--danger)' : (humidity >= 60 ? 'var(--warning)' : 'var(--success)'),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Card 3: MQ-2 Gas / Smoke Sensor */}
            <div className="card" style={{ margin: 0, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  MQ-2 Gas / Smoke
                </span>
                <IonIcon icon={speedometerOutline} style={{ color: gasValue >= gasThreshold ? 'var(--danger)' : (gasValue > 800 ? 'var(--warning)' : 'var(--success)') }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>
                {isOnline ? `${gasValue}` : '--'} <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'normal' }}>ADC</span>
              </div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonBadge color={gasValue >= gasThreshold ? 'danger' : (gasValue > 800 ? 'warning' : 'success')} style={{ fontSize: '10px' }}>
                  {gasValue >= gasThreshold ? 'HAZARD SPIKE' : (gasValue > 800 ? 'ELEVATED' : 'CLEAN AIR')}
                </IonBadge>
                <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Limit: {gasThreshold}</small>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, (gasValue / 4095) * 100))}%`,
                  height: '100%',
                  background: gasValue >= gasThreshold ? 'var(--danger)' : (gasValue > 800 ? 'var(--warning)' : 'var(--success)'),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Quick Nav Card to Analytics Tab */}
          <div className="card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: 'var(--surface-alt)'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>
                Historical Telemetry & Bar Chart
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                View 12-interval rolling temperature trends and sensor safety statistics.
              </div>
            </div>
            <IonButton routerLink="/analytics" size="small" color="tertiary">
              <IonIcon icon={statsChartOutline} slot="start" />
              Open Analytics
            </IonButton>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Climate;

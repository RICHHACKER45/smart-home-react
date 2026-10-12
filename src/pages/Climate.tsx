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
    isDeveloperMode,
    pollDevices
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
  const isCriticalHeatActive = temperature >= 40 || (isAlarming && temperature >= 40);
  const isWarmAdvisoryActive = temperature >= 35 && temperature < 40;

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
                  {isDeveloperMode 
                    ? (hardwareConnected 
                        ? `Live ESP32 Gateway (${hardwareConfig.esp32Ip})`
                        : (simulationActive ? 'Simulation Engine Telemetry' : 'Hardware Disconnected'))
                    : (isOnline ? 'Smart Hub Connected' : 'Smart Hub Offline')
                  }
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {isDeveloperMode
                    ? (isOnline ? 'Real-time sensor telemetry synchronized' : 'Offline • Values at baseline')
                    : (isOnline ? 'Real-time live sync active' : 'Offline • Awaiting gateway connection')
                  }
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

          {/* 1A. CRITICAL HEAT EMERGENCY CARD (Appears when Temperature >= 40°C) */}
          {isCriticalHeatActive && (
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
                      🚨 CRITICAL HEAT HAZARD DETECTED
                    </h3>
                    <IonBadge color="danger">CRITICAL HEAT (≥40°C)</IonBadge>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Extreme ambient temperature spike ({temperature.toFixed(1)}°C) detected in the home!
                  </p>
                </div>
              </div>

              {/* Actionable Emergency Safety Guidance */}
              <div style={{ 
                background: 'rgba(15, 27, 45, 0.8)', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                border: '1px solid rgba(244, 63, 94, 0.3)',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recommended Safety Actions:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.6' }}>
                  <li><strong>Evacuate immediate area:</strong> Move vulnerable residents and pets to a cooler environment.</li>
                  <li><strong>Emergency Egress:</strong> Front door lock has automatically unlocked for safety.</li>
                  <li><strong>Inspect Heat Sources:</strong> Check stove, heaters, and electrical appliances for fire risk.</li>
                  <li>Activate maximum cooling or seek emergency assistance if temperature continues to climb.</li>
                </ul>
              </div>

              {/* Safety Status Indicators */}
              <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: isDeveloperMode ? '10px' : '4px', lineHeight: '1.4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <IonIcon icon={lockOpenOutline} />
                  <span><strong>Egress Protocol:</strong> Door unlocked automatically for emergency safety.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', marginTop: '4px' }}>
                  <IonIcon icon={pulseOutline} />
                  <span><strong>Audible Siren:</strong> Hardware buzzer pulsing active alarm tone.</span>
                </div>
              </div>

              {/* Developer Diagnostics Box (Visible ONLY in Developer Mode) */}
              {isDeveloperMode && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#fcd34d',
                  marginTop: '10px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>🛠️ Developer Telemetry (Temperature Probe):</div>
                  <div>Live Temperature: <strong>{temperature.toFixed(1)}°C</strong> | Hazard Threshold: <strong>40.0°C</strong></div>
                  <div>Sensor Source: <strong>DHT22 Environmental Sensor</strong></div>
                </div>
              )}
            </div>
          )}

          {/* 1B. SYNCHRONIZED SMOKE & GAS HAZARD CARD (Appears when Smoke/Gas Detected or Alarming) */}
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
                      🚨 SMOKE / GAS HAZARD DETECTED
                    </h3>
                    <IonBadge color="danger">URGENT HAZARD</IonBadge>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px' }}>
                    Elevated airborne smoke or combustible gas detected in the home.
                  </p>
                </div>
              </div>

              {/* Actionable Emergency Safety Guidance */}
              <div style={{ 
                background: 'rgba(15, 27, 45, 0.8)', 
                borderRadius: '12px', 
                padding: '12px 14px', 
                border: '1px solid rgba(244, 63, 94, 0.3)',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recommended Safety Actions:
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.6' }}>
                  <li><strong>Evacuate immediately:</strong> Move all residents outdoor to safe fresh air.</li>
                  <li><strong>Emergency Egress:</strong> Front door lock has automatically unlocked for fast exit.</li>
                  <li><strong>Ventilation:</strong> Open windows and doors only if safe to do so.</li>
                  <li>Do not touch light switches or electrical appliances if fuel gas is suspected.</li>
                </ul>
              </div>

              {/* Safety Status Indicators */}
              <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: isDeveloperMode ? '10px' : '4px', lineHeight: '1.4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <IonIcon icon={lockOpenOutline} />
                  <span><strong>Egress Protocol:</strong> Door unlocked automatically for evacuation.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', marginTop: '4px' }}>
                  <IonIcon icon={pulseOutline} />
                  <span><strong>Audible Siren:</strong> Hardware buzzer pulsing active alarm tone.</span>
                </div>
              </div>

              {/* Developer Diagnostics Box (Visible ONLY in Developer Mode) */}
              {isDeveloperMode && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#fcd34d',
                  marginTop: '10px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>🛠️ Developer Telemetry (MQ-2 Sensor):</div>
                  <div>Gas Reading: <strong>{gasValue} ADC</strong> | Safety Threshold: <strong>{gasThreshold} ADC</strong></div>
                  <div>Air Ratio: <strong>{gasThreshold > 0 ? Math.round((gasValue / gasThreshold) * 100) : 100}%</strong> | Limit Exceeded: <strong>+{Math.max(0, gasValue - gasThreshold)} ADC</strong></div>
                </div>
              )}
            </div>
          )}

          {/* 2A. HIGH AMBIENT TEMPERATURE ADVISORY CARD (Advisory, not alarm - triggers at 35°C - 39.9°C) */}
          {isWarmAdvisoryActive && (
            <div className="card" style={{
              border: '1.5px solid var(--warning)',
              background: 'rgba(245, 158, 11, 0.1)',
              marginBottom: '16px',
              borderRadius: '14px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <IonIcon icon={thermometerOutline} style={{ fontSize: '24px', color: 'var(--warning)', marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--warning)', fontSize: '15px', fontWeight: 'bold' }}>
                      ⚠️ High Ambient Temperature Advisory
                    </h4>
                    <IonBadge color="warning">{temperature.toFixed(1)}°C</IonBadge>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 6px 0', fontSize: '12px', lineHeight: '1.4' }}>
                    Indoor temperature is elevated above comfortable levels (20°C - 26°C). Risk of heat fatigue and discomfort. Recommend activating air conditioning, closing window shades, and staying hydrated.
                  </p>
                  <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    ℹ️ Advisory warning only. Emergency siren and door lock remain normal until 40.0°C.
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* 2B. ELEVATED HUMIDITY WARNING CARD (Advisory, not alarm - triggers at >= 60%) */}
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
                      {humidity >= 70 ? '⚠️ High Indoor Humidity Advisory' : '⚠️ Elevated Humidity Advisory'}
                    </h4>
                    <IonBadge color="warning">{humidity}% RH</IonBadge>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 6px 0', fontSize: '12px', lineHeight: '1.4' }}>
                    {humidity >= 70 
                      ? 'High moisture detected. Risk of condensation, mold spores, and mildew. Recommend activating AC Dry Mode or ventilation fan.'
                      : 'Indoor humidity is above optimal comfort range (30% - 55%). Ensure ventilation or fan circulation.'}
                  </p>
                  <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    ℹ️ Advisory only. Door lock and emergency systems remain normal.
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
                <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                  {isDeveloperMode ? 'Limit: 40.0°C (DHT22)' : (temperature >= 40 ? 'Heat warning' : 'Comfortable')}
                </small>
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
                  Humidity
                </span>
                <IonIcon icon={waterOutline} style={{ color: humidity >= 70 ? 'var(--danger)' : (humidity >= 60 ? 'var(--warning)' : 'var(--accent)') }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>
                {isOnline ? `${humidity}%` : '--'}
              </div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonBadge color={humidity >= 70 ? 'danger' : (humidity >= 60 ? 'warning' : 'success')} style={{ fontSize: '10px' }}>
                  {humidity >= 70 ? 'HIGH (≥70%)' : (humidity >= 60 ? 'ELEVATED' : 'OPTIMAL')}
                </IonBadge>
                <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                  {isDeveloperMode ? 'Target: 45% (DHT22)' : (humidity >= 60 ? 'Ventilate' : 'Healthy')}
                </small>
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

            {/* Card 3: Air Quality & Smoke (Simplified by default; MQ-2/ADC in Dev Mode) */}
            <div className="card" style={{ margin: 0, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Air Quality & Smoke
                </span>
                <IonIcon icon={speedometerOutline} style={{ color: gasValue >= gasThreshold ? 'var(--danger)' : (gasValue > 800 ? 'var(--warning)' : 'var(--success)') }} />
              </div>
              
              {/* Value: Human-Friendly text by default; ADC in Dev Mode */}
              <div style={{ fontSize: isDeveloperMode ? '28px' : '20px', fontWeight: 'bold', color: gasValue >= gasThreshold ? 'var(--danger)' : (gasValue > 800 ? 'var(--warning)' : 'var(--success)'), minHeight: '34px', display: 'flex', alignItems: 'center' }}>
                {!isOnline ? '--' : (
                  isDeveloperMode ? (
                    <>
                      {gasValue} <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '4px' }}>ADC</span>
                    </>
                  ) : (
                    gasValue >= gasThreshold ? 'Hazard Spike' : (gasValue > 800 ? 'Elevated' : 'Clean & Safe')
                  )
                )}
              </div>

              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonBadge color={gasValue >= gasThreshold ? 'danger' : (gasValue > 800 ? 'warning' : 'success')} style={{ fontSize: '10px' }}>
                  {gasValue >= gasThreshold ? 'HAZARD SPIKE' : (gasValue > 800 ? 'ELEVATED' : 'CLEAN AIR')}
                </IonBadge>
                <small style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                  {isDeveloperMode 
                    ? `Limit: ${gasThreshold} ADC (MQ-2)` 
                    : (gasValue >= gasThreshold ? 'Hazard active' : (gasValue > 800 ? 'Particles detected' : 'Fresh air'))
                  }
                </small>
              </div>
              
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${!isOnline ? 0 : (isDeveloperMode ? Math.min(100, Math.max(0, (gasValue / 4095) * 100)) : (gasValue >= gasThreshold ? 100 : (gasValue > 800 ? 55 : 20)))}%`,
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

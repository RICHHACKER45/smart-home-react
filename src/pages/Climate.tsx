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
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import { 
  wifiOutline, 
  refreshOutline, 
  flameOutline, 
  waterOutline, 
  thermometerOutline, 
  warningOutline, 
  shieldCheckmarkOutline, 
  lockOpenOutline, 
  lockClosedOutline, 
  alertCircleOutline, 
  speedometerOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  pulseOutline
} from 'ionicons/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useStore } from '../store/useStore';

const Climate: React.FC = () => {
  const { 
    temperatureHistory, 
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
    resetSystem,
    alerts,
    logs
  } = useStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [historyTab, setHistoryTab] = useState<'alarms' | 'doors'>('alarms');

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await pollDevices();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Evaluate overall room condition & thermal comfort
  const getRoomCondition = () => {
    const isOnline = hardwareConnected || simulationActive;
    if (!isOnline && temperature === 0) {
      return {
        title: "HUB OFFLINE / SENSOR DISCONNECTED",
        desc: "ESP32 hardware is unreachable. Reconnect Wi-Fi or enable Developer Simulation mode to stream telemetry.",
        badge: "OFFLINE",
        color: "var(--text-dim)",
        icon: wifiOutline
      };
    }

    if (isAlarming || smokeActive || (gasValue > 0 && gasValue >= gasThreshold)) {
      return {
        title: "HAZARDOUS: EMERGENCY PROTOCOL ENGAGED",
        desc: "High concentration of smoke or combustible gas detected. Egress doors auto-unlocked.",
        badge: "EMERGENCY HAZARD",
        color: "var(--danger)",
        icon: flameOutline
      };
    }

    if (temperature >= 40) {
      return {
        title: "CRITICAL HIGH HEAT (≥40°C)",
        desc: "Ambient temperature has exceeded safe threshold limit. High fire/overheat risk.",
        badge: "EXTREME HEAT",
        color: "var(--danger)",
        icon: thermometerOutline
      };
    }

    if (humidity >= 70) {
      return {
        title: "HIGH INDOOR MOISTURE (≥70%)",
        desc: "High ambient moisture detected. Elevated risk of condensation, mold spores, and dust mites.",
        badge: "HEAVY MOISTURE",
        color: "var(--warning)",
        icon: waterOutline
      };
    }

    if (humidity >= 60) {
      return {
        title: "ELEVATED HUMIDITY (≥60%)",
        desc: "Relative humidity is above optimal comfort range. Room feels warm and muggy.",
        badge: "ELEVATED HUMIDITY",
        color: "var(--warning)",
        icon: waterOutline
      };
    }

    if (temperature >= 30) {
      return {
        title: "WARM INDOOR ENVIRONMENT",
        desc: "Room is warm. Cooling ventilation or fan circulation recommended.",
        badge: "WARM",
        color: "var(--warning)",
        icon: thermometerOutline
      };
    }

    if (temperature < 21) {
      return {
        title: "COOL INDOOR ENVIRONMENT",
        desc: "Room temperature is below 21°C. Heating or ambient adjustment may be preferred.",
        badge: "COOL",
        color: "var(--accent)",
        icon: thermometerOutline
      };
    }

    return {
      title: "OPTIMAL LIVING ENVIRONMENT",
      desc: "Temperature, relative humidity, and air purity are within recommended comfort standards.",
      badge: "OPTIMAL",
      color: "var(--success)",
      icon: checkmarkCircleOutline
    };
  };

  const condition = getRoomCondition();

  // Filter recent alarms & door activities
  const recentAlarms = (alerts || []).slice(0, 10);
  const recentDoorLogs = (logs || [])
    .filter(log => log.eventCategory === 'DOOR' || log.actionDescription.toLowerCase().includes('door'))
    .slice(0, 10);

  const formatTimestamp = (rawDate?: string) => {
    if (!rawDate) return 'Just now';
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' • ' + d.toLocaleDateString();
      }
    } catch {}
    return rawDate;
  };

  const chartData = temperatureHistory.map((temp, index) => ({
    time: `T-${11 - index}`,
    temp
  }));

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
                backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)',
                boxShadow: isOnline ? '0 0 8px var(--success)' : 'none'
              }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text)' }}>
                  {hardwareConnected 
                    ? `Live ESP32 Gateway (${hardwareConfig.esp32Ip})`
                    : (simulationActive ? 'Simulation Engine Telemetry' : 'Hardware Disconnected')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {isOnline ? 'Real-time sensor telemetry synchronized' : 'Offline • Values showing 0'}
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

          {/* Hardware Connection Warning Banner when Offline */}
          {!hardwareConnected && hardwareConfig.mode === 'hardware' && !simulationActive && (
            <div className="card" style={{ border: '1.5px solid var(--warning)', backgroundColor: 'rgba(234, 179, 8, 0.12)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <IonIcon icon={wifiOutline} style={{ fontSize: '26px', color: 'var(--warning)', marginTop: '2px' }} />
                <div>
                  <h3 style={{ color: 'var(--warning)', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    ESP32 Telemetry Disconnected
                  </h3>
                  <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px', lineHeight: '1.4' }}>
                    Cannot reach ESP32 Hub at <code>{hardwareConfig.esp32Ip}</code>. Ensure the microcontroller is powered and on the same Wi-Fi subnet. Or toggle <strong>Developer Simulation Mode</strong> in Settings to test without physical sensors.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              background: humidity >= 70 
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.06))' 
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03))',
              marginBottom: '16px',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IonIcon icon={waterOutline} style={{ fontSize: '28px', color: 'var(--warning)' }} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--warning)', fontSize: '16px', fontWeight: 'bold' }}>
                      {humidity >= 70 ? '⚠️ High Indoor Humidity Warning' : '⚠️ Elevated Humidity Advisory'}
                    </h3>
                    <IonBadge color="warning" style={{ fontWeight: 'bold' }}>
                      {humidity}% RH
                    </IonBadge>
                  </div>

                  <p style={{ color: 'var(--text)', margin: '6px 0 10px 0', fontSize: '13px', lineHeight: '1.45' }}>
                    {humidity >= 70 ? (
                      <>
                        <strong>Heavy moisture detected ({humidity}%).</strong> When relative humidity exceeds 70%, condensation rapidly forms on cool surfaces, increasing the risk of black mold spores, dust mites, and mildew.
                      </>
                    ) : (
                      <>
                        <strong>Elevated moisture level ({humidity}%).</strong> Humidity is above the ideal indoor comfort standard (30% – 55%). The air may feel heavy, humid, and stuffy.
                      </>
                    )}
                  </p>

                  {/* Actionable recommendations */}
                  <div style={{
                    background: 'rgba(15, 27, 45, 0.65)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                      💡 Recommended Actions:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted)' }}>
                      <li>Switch Air Conditioner to <strong>Dry / Dehumidify Mode</strong>.</li>
                      <li>Turn on exhaust fans or mechanical room ventilation.</li>
                      <li>Check for boiling pots, open showers, or moisture sources.</li>
                    </ul>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                    <IonIcon icon={informationCircleOutline} />
                    <span>Advisory warning only: This does not trigger the emergency siren or door unlock.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. REAL-TIME ENVIRONMENT TELEMETRY METRIC GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Temperature Card */}
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
              {/* Range indicator */}
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, (temperature / 50) * 100))}%`,
                  height: '100%',
                  background: temperature >= 40 ? 'var(--danger)' : (temperature >= 30 ? 'var(--warning)' : 'var(--accent)'),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Relative Humidity Card */}
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
              {/* Humidity bar */}
              <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, Math.max(0, humidity))}%`,
                  height: '100%',
                  background: humidity >= 70 ? 'var(--danger)' : (humidity >= 60 ? 'var(--warning)' : 'var(--success)'),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* MQ-2 Gas / Smoke Sensor Card */}
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
              {/* Gas ADC bar */}
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

          {/* 4. OVERALL ROOM CONDITION SYNTHESIS */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <IonIcon icon={condition.icon} style={{ fontSize: '24px', color: condition.color }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: condition.color }}>
                    {condition.title}
                  </h3>
                  <IonBadge style={{ backgroundColor: condition.color, color: '#fff', fontSize: '10px' }}>
                    {condition.badge}
                  </IonBadge>
                </div>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px', lineHeight: '1.45' }}>
              {condition.desc}
            </p>
          </div>

          {/* 5. RECENT INCIDENTS & SECURITY EVENT HISTORY (Alarm Reasons & Door Access) */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '20px', color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  Recent Incident & Security History
                </h3>
              </div>
            </div>

            {/* Tab switch between Alarms and Door Access */}
            <IonSegment 
              value={historyTab} 
              onIonChange={(e) => setHistoryTab(e.detail.value as 'alarms' | 'doors')}
              style={{ marginBottom: '14px', background: 'var(--surface-alt)' }}
            >
              <IonSegmentButton value="alarms">
                <IonLabel>🚨 Alarm Incidents ({recentAlarms.length})</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="doors">
                <IonLabel>🚪 Door Access ({recentDoorLogs.length})</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            {/* TAB 1: EMERGENCY ALARMS HISTORY */}
            {historyTab === 'alarms' && (
              <div>
                {recentAlarms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-dim)' }}>
                    <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '36px', color: 'var(--success)', marginBottom: '8px' }} />
                    <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>No Alarms Recorded</div>
                    <small>System environment has been secure with zero emergency triggers.</small>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentAlarms.map((alert) => {
                      const isHeat = alert.alertType === 'CRITICAL_HEAT';
                      const isSmoke = alert.alertType === 'SMOKE_DETECTED';
                      return (
                        <div 
                          key={alert.id}
                          style={{
                            background: 'var(--surface-alt)',
                            border: `1px solid ${alert.status === 'TRIGGERED' ? 'var(--danger)' : 'var(--border)'}`,
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <IonIcon 
                            icon={isSmoke ? flameOutline : (isHeat ? thermometerOutline : alertCircleOutline)} 
                            style={{ 
                              fontSize: '22px', 
                              color: alert.status === 'TRIGGERED' ? 'var(--danger)' : 'var(--warning)', 
                              marginTop: '2px' 
                            }} 
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text)' }}>
                                {isSmoke 
                                  ? 'Smoke / Combustible Gas Spike' 
                                  : (isHeat ? 'Critical Heat Threshold Exceeded' : 'Manual Siren Emergency')}
                              </strong>
                              <IonBadge color={alert.status === 'TRIGGERED' ? 'danger' : 'success'} style={{ fontSize: '10px' }}>
                                {alert.status}
                              </IonBadge>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '2px', fontWeight: '500' }}>
                              Cause: {alert.peakValue || 'Threshold exceeded'}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                              <span>{formatTimestamp(alert.triggeredAt)}</span>
                              <span style={{ color: 'var(--success)' }}>
                                {alert.autoUnlockExecuted ? '🔓 Auto-Unlock Executed' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DOOR ACCESS & UNLOCKS */}
            {historyTab === 'doors' && (
              <div>
                {recentDoorLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-dim)' }}>
                    <IonIcon icon={lockClosedOutline} style={{ fontSize: '36px', color: 'var(--accent)', marginBottom: '8px' }} />
                    <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>No Door Events Logged</div>
                    <small>Door access and authentication logs will appear here.</small>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {recentDoorLogs.map((log) => {
                      const isUnlock = log.actionDescription.toLowerCase().includes('unlock');
                      const isFailsafe = log.actorName?.toLowerCase().includes('failsafe') || log.actionDescription.toLowerCase().includes('failsafe');
                      return (
                        <div 
                          key={log.id}
                          style={{
                            background: 'var(--surface-alt)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <IonIcon 
                            icon={isUnlock ? lockOpenOutline : lockClosedOutline} 
                            style={{ 
                              fontSize: '20px', 
                              color: isFailsafe ? 'var(--danger)' : (isUnlock ? 'var(--warning)' : 'var(--success)'), 
                              marginTop: '2px' 
                            }} 
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text)' }}>
                                {log.actionDescription}
                              </strong>
                              <IonBadge color={log.statusResult === 'SUCCESS' ? 'success' : (log.statusResult === 'TRIGGERED' ? 'danger' : 'warning')} style={{ fontSize: '10px' }}>
                                {log.statusResult}
                              </IonBadge>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                              <span>👤 Authorized By: <strong style={{ color: 'var(--accent)' }}>{log.actorName || 'User'}</strong></span>
                              <span>{formatTimestamp(log.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. TEMPERATURE HISTORY BAR CHART */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Temperature Telemetry Trend</h3>
              <small style={{ color: 'var(--text-dim)' }}>Last 12 Intervals</small>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" domain={['dataMin - 2', 'dataMax + 2']} fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-alt)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px',
                      color: 'var(--text)'
                    }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Bar dataKey="temp" radius={[4, 4, 0, 0]}>
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
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Climate;

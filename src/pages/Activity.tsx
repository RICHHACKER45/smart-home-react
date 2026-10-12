import React, { useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonButton,
  IonIcon
} from '@ionic/react';
import { 
  lockClosedOutline, 
  lockOpenOutline,
  thermometerOutline, 
  warningOutline, 
  shieldCheckmarkOutline, 
  hardwareChipOutline,
  sparklesOutline,
  layersOutline,
  flameOutline,
  waterOutline
} from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { EventCategory } from '../types/database';
import './Activity.css';

const Activity: React.FC = () => {
  const { logs, isAlarming, resetSystem } = useStore();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Logs', icon: layersOutline },
    { id: 'EMERGENCY', label: 'Emergency', icon: warningOutline },
    { id: 'DOOR', label: 'Door', icon: lockClosedOutline },
    { id: 'CLIMATE', label: 'Climate', icon: thermometerOutline },
    { id: 'AUTH', label: 'Security & PIN', icon: shieldCheckmarkOutline },
    { id: 'SYSTEM', label: 'System Hub', icon: hardwareChipOutline }
  ];

  const getCategoryCount = (catId: string) => {
    if (catId === 'ALL') return logs.length;
    return logs.filter((l) => l.eventCategory === catId).length;
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedFilter === 'ALL') return true;
    return log.eventCategory === selectedFilter;
  });

  const getCategoryIcon = (category: EventCategory) => {
    switch (category) {
      case 'DOOR':
        return lockClosedOutline;
      case 'CLIMATE':
        return thermometerOutline;
      case 'EMERGENCY':
        return flameOutline;
      case 'AUTH':
        return shieldCheckmarkOutline;
      case 'SYSTEM':
      default:
        return hardwareChipOutline;
    }
  };

  const getCategoryColor = (category: EventCategory) => {
    switch (category) {
      case 'DOOR':
        return '#38bdf8';
      case 'CLIMATE':
        return '#10b981';
      case 'EMERGENCY':
        return '#f43f5e';
      case 'AUTH':
        return '#a855f7';
      case 'SYSTEM':
      default:
        return '#f59e0b';
    }
  };

  const getResultBadgeStyle = (result: string) => {
    if (result === 'SUCCESS') {
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' };
    }
    if (result === 'FAILED') {
      return { background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.4)' };
    }
    if (result === 'TRIGGERED') {
      return { background: 'rgba(244, 63, 94, 0.25)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.5)' };
    }
    return { background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' };
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Audit & Activity Logs</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Activity Logs</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <div style={{ padding: '16px' }}>
          
          {/* Header Bar */}
          <div className="activity-header-bar">
            <div>
              <h1 className="activity-title-main">System Audit Trail</h1>
              <div className="activity-subtitle">Real-time hardware, security & safety events • Immutable Audit Record</div>
            </div>
          </div>

          {/* Active Emergency Strip (Only visible when emergency is ongoing) */}
          {isAlarming && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1.5px solid var(--danger)',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={flameOutline} style={{ color: 'var(--danger)', fontSize: '22px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--danger)' }}>
                    🚨 Emergency Hazard In Progress
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Buzzer siren active & door failsafe egress unlocked
                  </div>
                </div>
              </div>
              <IonButton size="small" color="success" onClick={resetSystem}>
                Silence / Reset
              </IonButton>
            </div>
          )}

          {/* Overhauled High-Contrast Filter Tabs */}
          <div className="activity-tabs-scroll">
            {categories.map((cat) => {
              const count = getCategoryCount(cat.id);
              const isActive = selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`activity-tab-btn tab-${cat.id} ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(cat.id)}
                >
                  <IonIcon icon={cat.icon} className="tab-icon" />
                  <span>{cat.label}</span>
                  <span className="tab-count-badge">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Unified Log List Card */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: '700' }}>
                {selectedFilter === 'ALL' 
                  ? `All Events (${filteredLogs.length})` 
                  : `${categories.find(c => c.id === selectedFilter)?.label || selectedFilter} (${filteredLogs.length})`
                }
              </h2>
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '36px 16px', 
                background: 'var(--surface-alt)',
                borderRadius: '14px',
                border: '1px dashed rgba(148, 163, 184, 0.2)'
              }}>
                <IonIcon icon={sparklesOutline} style={{ fontSize: '32px', color: 'var(--text-dim)', marginBottom: '8px' }} />
                <strong style={{ display: 'block', color: 'var(--text-dim)', fontSize: '14px' }}>
                  No Log Entries Found
                </strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
                  No activity has been recorded yet for the {categories.find(c => c.id === selectedFilter)?.label || selectedFilter} category.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredLogs.map((log) => {
                  const catColor = getCategoryColor(log.eventCategory);
                  const isDoor = log.eventCategory === 'DOOR';
                  const isClimate = log.eventCategory === 'CLIMATE';
                  const isEmergency = log.eventCategory === 'EMERGENCY';
                  return (
                    <div 
                      key={log.id} 
                      className="log-item-card"
                      style={{ 
                        borderLeft: `4px solid ${catColor}`,
                        boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`
                      }}
                    >
                      <div className="log-item-header">
                        <div className="log-category-tag" style={{ color: catColor }}>
                          <IonIcon icon={
                            isEmergency ? flameOutline : (
                              isDoor ? (log.actionDescription.toLowerCase().includes('unlock') ? lockOpenOutline : lockClosedOutline) : (
                                isClimate ? waterOutline : getCategoryIcon(log.eventCategory)
                              )
                            )
                          } />
                          <span>{log.eventCategory}</span>
                          {log.actorName && (
                            <span className="log-actor-name">
                              • {log.actorName}
                            </span>
                          )}
                        </div>
                        
                        <div className="log-meta-right">
                          <span 
                            className="log-status-badge"
                            style={getResultBadgeStyle(log.statusResult)}
                          >
                            {log.statusResult}
                          </span>
                          <span className="log-time-text">
                            {log.createdAt}
                          </span>
                        </div>
                      </div>

                      <div className="log-action-text" style={{
                        color: isEmergency ? 'var(--text)' : 'var(--text)'
                      }}>
                        {log.actionDescription}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Activity;

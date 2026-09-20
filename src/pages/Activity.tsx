import React, { useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonSegment, 
  IonSegmentButton, 
  IonLabel,
  IonButton,
  IonIcon
} from '@ionic/react';
import { 
  lockClosedOutline, 
  thermometerOutline, 
  warningOutline, 
  shieldCheckmarkOutline, 
  hardwareChipOutline,
  refreshOutline,
  sparklesOutline
} from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { EventCategory } from '../types/database';

const Activity: React.FC = () => {
  const { logs, seedDemoLogs, clearDatabaseLogs } = useStore();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

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
        return warningOutline;
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
        return '#64748b';
    }
  };

  const getResultBadgeStyle = (result: string) => {
    if (result === 'SUCCESS') {
      return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
    }
    if (result === 'FAILED') {
      return { background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' };
    }
    if (result === 'TRIGGERED') {
      return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
    }
    return { background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' };
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
          {/* Category Filter Segments */}
          <IonSegment 
            value={selectedFilter} 
            onIonChange={(e) => setSelectedFilter(e.detail.value as string)}
            scrollable
            style={{ marginBottom: '16px', background: 'var(--surface-alt)', borderRadius: '12px' }}
          >
            <IonSegmentButton value="ALL">
              <IonLabel>All ({logs.length})</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="DOOR">
              <IonLabel>Door</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="CLIMATE">
              <IonLabel>Climate</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="EMERGENCY">
              <IonLabel>Emergency</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="AUTH">
              <IonLabel>Security</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* Log List Card */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>
                {selectedFilter === 'ALL' ? 'Complete Audit Trail' : `${selectedFilter} Events`}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <IonButton size="small" fill="clear" onClick={seedDemoLogs} title="Seed Mock Logs">
                  <IonIcon icon={sparklesOutline} slot="icon-only" />
                </IonButton>
                <IonButton size="small" fill="clear" color="medium" onClick={clearDatabaseLogs} title="Reset DB">
                  <IonIcon icon={refreshOutline} slot="icon-only" />
                </IonButton>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                <p>No activity recorded in this category.</p>
                <IonButton size="small" color="primary" fill="outline" onClick={seedDemoLogs}>
                  <IonIcon icon={sparklesOutline} slot="start" />
                  Seed Sample Test Logs
                </IonButton>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    style={{ 
                      padding: '14px', 
                      background: 'var(--surface-alt)', 
                      borderRadius: '12px',
                      borderLeft: `4px solid ${getCategoryColor(log.eventCategory)}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon 
                          icon={getCategoryIcon(log.eventCategory)} 
                          style={{ color: getCategoryColor(log.eventCategory), fontSize: '16px' }} 
                        />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: getCategoryColor(log.eventCategory) }}>
                          {log.eventCategory}
                        </span>
                        {log.actorName && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            • {log.actorName}
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 6px', 
                          borderRadius: '6px',
                          fontWeight: '600',
                          ...getResultBadgeStyle(log.statusResult)
                        }}>
                          {log.statusResult}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {log.createdAt}
                        </span>
                      </div>
                    </div>

                    <div style={{ color: 'var(--text)', fontSize: '14px', lineHeight: '1.4' }}>
                      {log.actionDescription}
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

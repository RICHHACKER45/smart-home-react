import { useState, useEffect } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, thermometer, list, settings } from 'ionicons/icons';

import Dashboard from './pages/Dashboard';
import Climate from './pages/Climate';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import { useStore } from './store/useStore';
import { useSiren } from './hooks/useSiren';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { runSimulationTick } = useStore();
  
  // Custom hook for the audio siren logic
  useSiren();

  useEffect(() => {
    // Hide splash screen after 2.5 seconds
    setTimeout(() => setShowSplash(false), 2500);
    
    // Global simulation loop (every 3 seconds)
    const interval = setInterval(() => {
      runSimulationTick();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [runSimulationTick]);

  return (
    <IonApp className="app">
      {showSplash && (
        <div className="web-splash-screen">
          <div className="splash-content">
            <img src="assets/logo.svg" alt="Smart Home App Logo" className="splash-logo" />
            <h1 className="splash-title">Smart Home</h1>
          </div>
        </div>
      )}
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/climate" element={<Climate />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom" className="tab-bar">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon aria-hidden="true" icon={home} style={{ color: '#38bdf8' }} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="climate" href="/climate">
              <IonIcon aria-hidden="true" icon={thermometer} style={{ color: '#f43f5e' }} />
              <IonLabel>Climate</IonLabel>
            </IonTabButton>
            <IonTabButton tab="activity" href="/activity">
              <IonIcon aria-hidden="true" icon={list} style={{ color: '#f59e0b' }} />
              <IonLabel>Activity</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon aria-hidden="true" icon={settings} style={{ color: '#ebf4ff' }} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;

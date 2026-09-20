import React, { useState } from 'react';
import { 
  IonPage, 
  IonContent, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonItem, 
  IonLabel,
  useIonToast
} from '@ionic/react';
import { 
  personOutline, 
  lockClosedOutline, 
  eyeOutline, 
  eyeOffOutline, 
  shieldCheckmarkOutline,
  sparklesOutline
} from 'ionicons/icons';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useStore } from '../store/useStore';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login } = useStore();
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [presentToast] = useIonToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    const result = login(username, password);

    setTimeout(async () => {
      setIsLoading(false);
      if (result.success) {
        try {
          await Haptics.notification({ type: NotificationType.Success });
        } catch {}
        presentToast({
          message: `Welcome back, ${username}!`,
          duration: 2000,
          color: 'success'
        });
        onLoginSuccess();
      } else {
        try {
          await Haptics.notification({ type: NotificationType.Error });
        } catch {}
        setErrorMessage(result.message || 'Invalid credentials.');
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('password123');
    setErrorMessage('');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="login-content">
        <div className="login-container">
          
          <div className="login-card">
            {/* Header / Logo */}
            <div className="login-header">
              <div className="login-logo-wrapper">
                <img src="assets/logo.svg" alt="Smart Home Logo" className="login-logo-img" />
              </div>
              <h1 className="login-title">Smart Home</h1>
              <p className="login-subtitle">Secure Access & Device Monitor</p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="login-error-banner shake-animation">
                {errorMessage}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <IonLabel className="input-label">Username</IonLabel>
                <div className="input-wrapper">
                  <IonIcon icon={personOutline} className="input-icon" />
                  <IonInput
                    type="text"
                    value={username}
                    placeholder="Enter username"
                    onIonInput={(e) => setUsername(e.detail.value!)}
                    required
                    className="custom-input"
                  />
                </div>
              </div>

              <div className="input-group">
                <IonLabel className="input-label">Password</IonLabel>
                <div className="input-wrapper">
                  <IonIcon icon={lockClosedOutline} className="input-icon" />
                  <IonInput
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="Enter password"
                    onIonInput={(e) => setPassword(e.detail.value!)}
                    required
                    className="custom-input"
                  />
                  <button 
                    type="button" 
                    className="toggle-password-btn" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </div>
              </div>

              <IonButton 
                type="submit" 
                expand="block" 
                className="login-submit-btn" 
                disabled={isLoading}
              >
                {isLoading ? (
                  'Authenticating...'
                ) : (
                  <>
                    <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                    Sign In to Dashboard
                  </>
                )}
              </IonButton>
            </form>

            {/* Default Credentials Hint Card */}
            <div className="login-hint-card" onClick={handleFillDemo}>
              <div className="hint-header">
                <IonIcon icon={sparklesOutline} className="hint-icon" />
                <span>Default Testing Credentials (Tap to Fill)</span>
              </div>
              <div className="hint-credentials">
                <div>User: <strong>admin</strong></div>
                <div>Pass: <strong>password123</strong></div>
                <div>Door PIN: <strong>1234</strong></div>
              </div>
            </div>

          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;

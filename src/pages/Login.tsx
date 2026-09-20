import React, { useState } from 'react';
import { 
  IonPage, 
  IonContent, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonSegment,
  IonSegmentButton,
  IonLabel,
  useIonToast
} from '@ionic/react';
import { 
  personOutline, 
  lockClosedOutline, 
  mailOutline,
  keyOutline,
  eyeOutline, 
  eyeOffOutline, 
  shieldCheckmarkOutline,
  personAddOutline,
  sparklesOutline,
  logInOutline
} from 'ionicons/icons';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useStore } from '../store/useStore';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login, register } = useStore();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In State
  const [signinIdentifier, setSigninIdentifier] = useState<string>('admin');
  const [signinPassword, setSigninPassword] = useState<string>('password123');
  
  // Sign Up State
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPass, setSignupConfirmPass] = useState<string>('');
  const [signupPin, setSignupPin] = useState<string>('1234');
  
  // Common UI State
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [presentToast] = useIonToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!signinIdentifier.trim() || !signinPassword.trim()) {
      setErrorMessage('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    const result = await login(signinIdentifier, signinPassword);
    setIsLoading(false);

    if (result.success) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}
      presentToast({
        message: `Welcome back, ${signinIdentifier}!`,
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
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!signupUsername.trim() || signupUsername.trim().length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }

    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPass) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (signupPin && !/^\d{4}$/.test(signupPin)) {
      setErrorMessage('Door passkey PIN must be exactly 4 digits.');
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    const result = await register({
      username: signupUsername,
      email: signupEmail,
      password: signupPassword,
      doorPasskey: signupPin || '1234'
    });

    setIsLoading(false);

    if (result.success) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}
      presentToast({
        message: `Account created! Welcome, ${signupUsername}!`,
        duration: 2500,
        color: 'success'
      });
      onLoginSuccess();
    } else {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch {}
      setErrorMessage(result.message || 'Registration failed.');
    }
  };

  const handleFillDemo = () => {
    setAuthMode('signin');
    setSigninIdentifier('admin');
    setSigninPassword('password123');
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

            {/* Auth Mode Toggle Tabs */}
            <div className="auth-segment-wrapper">
              <IonSegment 
                value={authMode} 
                onIonChange={(e) => {
                  setAuthMode(e.detail.value as 'signin' | 'signup');
                  setErrorMessage('');
                }}
                className="custom-auth-segment"
              >
                <IonSegmentButton value="signin" className="segment-btn">
                  <IonIcon icon={logInOutline} />
                  <IonLabel>Sign In</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="signup" className="segment-btn">
                  <IonIcon icon={personAddOutline} />
                  <IonLabel>Sign Up</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="login-error-banner shake-animation">
                {errorMessage}
              </div>
            )}

            {/* SIGN IN FORM */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="login-form">
                <div className="input-group">
                  <IonLabel className="input-label">Username or Email</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={personOutline} className="input-icon" />
                    <IonInput
                      type="text"
                      value={signinIdentifier}
                      placeholder="Enter username or email"
                      onIonInput={(e) => setSigninIdentifier(e.detail.value!)}
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
                      value={signinPassword}
                      placeholder="Enter password"
                      onIonInput={(e) => setSigninPassword(e.detail.value!)}
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
                    'Signing In...'
                  ) : (
                    <>
                      <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                      Sign In to Dashboard
                    </>
                  )}
                </IonButton>
              </form>
            )}

            {/* SIGN UP FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="login-form">
                <div className="input-group">
                  <IonLabel className="input-label">Username</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={personOutline} className="input-icon" />
                    <IonInput
                      type="text"
                      value={signupUsername}
                      placeholder="Choose a username"
                      onIonInput={(e) => setSignupUsername(e.detail.value!)}
                      required
                      className="custom-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label">Email Address</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={mailOutline} className="input-icon" />
                    <IonInput
                      type="email"
                      value={signupEmail}
                      placeholder="e.g. user@example.com"
                      onIonInput={(e) => setSignupEmail(e.detail.value!)}
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
                      value={signupPassword}
                      placeholder="Min 6 characters"
                      onIonInput={(e) => setSignupPassword(e.detail.value!)}
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

                <div className="input-group">
                  <IonLabel className="input-label">Confirm Password</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="input-icon" />
                    <IonInput
                      type={showPassword ? 'text' : 'password'}
                      value={signupConfirmPass}
                      placeholder="Re-enter password"
                      onIonInput={(e) => setSignupConfirmPass(e.detail.value!)}
                      required
                      className="custom-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label">
                    Door Passkey PIN <span className="label-subtext">(4 Digits)</span>
                  </IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={keyOutline} className="input-icon" />
                    <IonInput
                      type="password"
                      value={signupPin}
                      placeholder="1234"
                      maxlength={4}
                      inputmode="numeric"
                      onIonInput={(e) => setSignupPin(e.detail.value!)}
                      className="custom-input"
                    />
                  </div>
                </div>

                <IonButton 
                  type="submit" 
                  expand="block" 
                  className="login-submit-btn signup-btn" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      <IonIcon icon={personAddOutline} slot="start" />
                      Create Account
                    </>
                  )}
                </IonButton>
              </form>
            )}

            {/* Default Credentials Hint Card (Available in Sign In mode) */}
            {authMode === 'signin' && (
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
            )}

          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;

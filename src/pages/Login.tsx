import React, { useState, useEffect } from 'react';
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
  logInOutline,
  arrowBackOutline,
  refreshOutline,
  checkmarkCircleOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useStore } from '../store/useStore';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { login, requestOtp, verifyOtp, register } = useStore();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'otp_verify'>('signin');
  
  // Sign In State
  const [signinIdentifier, setSigninIdentifier] = useState<string>('admin');
  const [signinPassword, setSigninPassword] = useState<string>('password123');
  
  // Sign Up State
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPass, setSignupConfirmPass] = useState<string>('');
  const [signupPin, setSignupPin] = useState<string>('1234');
  
  // OTP Verification State
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Common UI State
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [presentToast] = useIonToast();

  // Cooldown countdown effect
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  const handleInitiateSignUp = async (e: React.FormEvent) => {
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

    // Request OTP via Resend API
    const otpRes = await requestOtp(signupEmail, signupUsername);
    setIsLoading(false);

    if (otpRes.success) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}
      setAuthMode('otp_verify');
      setResendCooldown(60);
      setEnteredOtp('');
      presentToast({
        message: otpRes.message || `Verification code sent to ${signupEmail}!`,
        duration: otpRes.message ? 6000 : 3500,
        color: otpRes.message ? 'warning' : 'primary'
      });
    } else {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch {}
      setErrorMessage(otpRes.message || 'Failed to dispatch verification email.');
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}

    // 1. Verify OTP locally & against expiry
    const verifyResult = verifyOtp(signupEmail, enteredOtp.trim());
    if (!verifyResult.success) {
      setIsLoading(false);
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch {}
      setErrorMessage(verifyResult.message || 'Invalid verification code.');
      return;
    }

    // 2. Finalize registration with hashed credentials
    const registerResult = await register({
      username: signupUsername,
      email: signupEmail,
      password: signupPassword,
      doorPasskey: signupPin || '1234'
    });

    setIsLoading(false);

    if (registerResult.success) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}
      presentToast({
        message: `🎉 Account activated! Welcome to Smart Home, ${signupUsername}!`,
        duration: 3000,
        color: 'success'
      });
      onLoginSuccess();
    } else {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch {}
      setErrorMessage(registerResult.message || 'Account creation failed.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    setErrorMessage('');
    const res = await requestOtp(signupEmail, signupUsername);
    setIsLoading(false);

    if (res.success) {
      setResendCooldown(60);
      presentToast({
        message: `New verification code sent to ${signupEmail}`,
        duration: 2500,
        color: 'success'
      });
    } else {
      setErrorMessage(res.message || 'Failed to resend code.');
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

            {/* Auth Mode Toggle Tabs (Hidden during OTP step) */}
            {authMode !== 'otp_verify' && (
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
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="login-error-banner shake-animation">
                <IonIcon icon={alertCircleOutline} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                {errorMessage}
              </div>
            )}

            {/* 1. SIGN IN FORM */}
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

            {/* 2. SIGN UP FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleInitiateSignUp} className="login-form">
                <div className="input-group">
                  <IonLabel className="input-label">Username</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={personOutline} className="input-icon" />
                    <IonInput
                      type="text"
                      value={signupUsername}
                      placeholder="Choose a username (e.g. alex)"
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
                      placeholder="e.g. your-email@gmail.com"
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
                    'Sending Code...'
                  ) : (
                    <>
                      <IonIcon icon={mailOutline} slot="start" />
                      Send Verification Code
                    </>
                  )}
                </IonButton>
              </form>
            )}

            {/* 3. OTP VERIFICATION FORM */}
            {authMode === 'otp_verify' && (
              <form onSubmit={handleVerifyOtpAndRegister} className="login-form otp-form">
                <div className="otp-info-card">
                  <div className="otp-icon-circle">
                    <IonIcon icon={mailOutline} />
                  </div>
                  <h3 className="otp-title">Verify Your Email</h3>
                  <p className="otp-description">
                    We sent a 6-digit confirmation code to:
                    <strong className="otp-target-email">{signupEmail}</strong>
                  </p>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label" style={{ textAlign: 'center' }}>
                    Enter 6-Digit Code
                  </IonLabel>
                  <div className="otp-input-wrapper">
                    <IonInput
                      type="text"
                      inputmode="numeric"
                      maxlength={6}
                      value={enteredOtp}
                      placeholder="------"
                      onIonInput={(e) => setEnteredOtp(e.detail.value || '')}
                      required
                      className="otp-code-input"
                      autofocus
                    />
                  </div>
                  <small className="otp-hint-text">Valid for 10 minutes</small>
                </div>

                <IonButton 
                  type="submit" 
                  expand="block" 
                  className="login-submit-btn signup-btn" 
                  disabled={isLoading || enteredOtp.length !== 6}
                >
                  {isLoading ? (
                    'Verifying...'
                  ) : (
                    <>
                      <IonIcon icon={checkmarkCircleOutline} slot="start" />
                      Verify & Activate Account
                    </>
                  )}
                </IonButton>

                <div className="otp-actions-row">
                  <button 
                    type="button" 
                    className="otp-action-btn"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <IonIcon icon={refreshOutline} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Email Code'}
                  </button>

                  <button 
                    type="button" 
                    className="otp-action-btn back-btn"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage('');
                    }}
                  >
                    <IonIcon icon={arrowBackOutline} />
                    Change Email
                  </button>
                </div>
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

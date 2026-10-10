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
  const { login, requestOtp, verifyOtp, register, requestPasswordReset, resetPasswordWithOtp } = useStore();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'otp_verify' | 'forgot_password' | 'forgot_password_otp'>('signin');
  
  // Sign In State
  const [signinIdentifier, setSigninIdentifier] = useState<string>('');
  const [signinPassword, setSigninPassword] = useState<string>('');
  
  // Sign Up State
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPass, setSignupConfirmPass] = useState<string>('');
  const [signupPin, setSignupPin] = useState<string>('');
  
  // OTP Verification State
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  
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
      doorPasskey: signupPin.trim()
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    const res = await requestPasswordReset(forgotEmail);
    setIsLoading(false);

    if (res.success) {
      setAuthMode('forgot_password_otp');
      setResendCooldown(60);
      presentToast({
        message: `Password reset code sent to ${forgotEmail}`,
        duration: 2500,
        color: 'success'
      });
    } else {
      setErrorMessage(res.message || 'Failed to send reset code.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!enteredOtp.trim() || !forgotNewPassword.trim()) {
      setErrorMessage('Please enter the OTP and a new password.');
      return;
    }

    setIsLoading(true);
    const res = await resetPasswordWithOtp(forgotEmail, enteredOtp, forgotNewPassword);
    setIsLoading(false);

    if (res.success) {
      setAuthMode('signin');
      setSigninIdentifier(forgotEmail);
      setSigninPassword(forgotNewPassword);
      setEnteredOtp('');
      presentToast({
        message: 'Password successfully reset! You can now sign in.',
        duration: 3000,
        color: 'success'
      });
    } else {
      setErrorMessage(res.message || 'Failed to reset password.');
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
            {(authMode === 'signin' || authMode === 'signup') && (
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
                    <input
                      type="text"
                      value={signinIdentifier}
                      placeholder="Enter username or email"
                      onChange={(e) => setSigninIdentifier(e.target.value)}
                      required
                      className="custom-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label">Password</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signinPassword}
                      placeholder="Enter password"
                      onChange={(e) => setSigninPassword(e.target.value)}
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
                  className={`login-submit-btn ${isLoading ? 'is-loading-btn' : ''}`}
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

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    className="demo-fill-btn" 
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setErrorMessage('');
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}

            {/* 2. SIGN UP FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleInitiateSignUp} className="login-form">
                <div className="input-group">
                  <IonLabel className="input-label">Username</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={personOutline} className="input-icon" />
                    <input
                      type="text"
                      value={signupUsername}
                      placeholder="Choose a username (e.g. alex)"
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                      className="custom-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label">Email Address</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={mailOutline} className="input-icon" />
                    <input
                      type="email"
                      value={signupEmail}
                      placeholder="e.g. your-email@gmail.com"
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="custom-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label">Password</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signupPassword}
                      placeholder="Min 6 characters"
                      onChange={(e) => setSignupPassword(e.target.value)}
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
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={signupConfirmPass}
                      placeholder="Re-enter password"
                      onChange={(e) => setSignupConfirmPass(e.target.value)}
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
                    <input
                      type="password"
                      value={signupPin}
                      placeholder="e.g. 5678"
                      maxLength={4}
                      inputMode="numeric"
                      onChange={(e) => setSignupPin(e.target.value)}
                      className="custom-input"
                    />
                  </div>
                </div>

                <IonButton 
                  type="submit" 
                  expand="block" 
                  className={`login-submit-btn signup-btn ${isLoading ? 'is-loading-btn' : ''}`}
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
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={enteredOtp}
                      placeholder="------"
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      required
                      className="otp-code-input"
                      autoFocus
                    />
                  </div>
                  <small className="otp-hint-text">Valid for 10 minutes</small>
                </div>

                <IonButton 
                  type="submit" 
                  expand="block" 
                  className={`login-submit-btn signup-btn ${isLoading ? 'is-loading-btn' : ''}`}
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

            {/* FORGOT PASSWORD FORM */}
            {authMode === 'forgot_password' && (
              <form onSubmit={handleForgotPassword} className="login-form">
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Enter your registered email address to receive a password reset code.
                </p>
                <div className="input-group">
                  <IonLabel className="input-label">Email Address</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={mailOutline} className="input-icon" />
                    <input
                      type="email"
                      value={forgotEmail}
                      placeholder="e.g. your-email@gmail.com"
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="custom-input"
                    />
                  </div>
                </div>
                
                <IonButton 
                  type="submit" 
                  expand="block" 
                  className={`login-submit-btn ${isLoading ? 'is-loading-btn' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
                </IonButton>

                <IonButton 
                  type="button"
                  expand="block"
                  fill="clear"
                  color="medium"
                  onClick={() => setAuthMode('signin')}
                  disabled={isLoading}
                  style={{ marginTop: '10px' }}
                >
                  <IonIcon icon={arrowBackOutline} slot="start" />
                  Back to Sign In
                </IonButton>
              </form>
            )}

            {/* FORGOT PASSWORD OTP VERIFICATION */}
            {authMode === 'forgot_password_otp' && (
              <form onSubmit={handleResetPassword} className="login-form">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <IonIcon icon={mailOutline} style={{ fontSize: '40px', color: 'var(--primary)' }} />
                  <p style={{ color: 'var(--text-dim)', marginTop: '10px' }}>
                    We sent a 6-digit verification code to<br/>
                    <strong style={{ color: 'var(--text)' }}>{forgotEmail}</strong>
                  </p>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label" style={{ textAlign: 'center' }}>
                    Verification Code (OTP)
                  </IonLabel>
                  <div className="otp-input-wrapper">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={enteredOtp}
                      placeholder="------"
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      required
                      className="otp-code-input"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <IonLabel className="input-label">New Password</IonLabel>
                  <div className="input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      placeholder="Enter new password"
                      onChange={(e) => setForgotNewPassword(e.target.value)}
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
                  className={`login-submit-btn signup-btn ${isLoading ? 'is-loading-btn' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </IonButton>

                <IonButton 
                  type="button"
                  expand="block"
                  fill="clear"
                  color="medium"
                  onClick={() => setAuthMode('forgot_password')}
                  disabled={isLoading}
                  style={{ marginTop: '10px' }}
                >
                  <IonIcon icon={arrowBackOutline} slot="start" />
                  Go Back
                </IonButton>
              </form>
            )}


          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;

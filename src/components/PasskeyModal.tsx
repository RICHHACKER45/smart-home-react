import React, { useState } from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import { lockClosed, backspaceOutline, closeOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { dbService } from '../services/dbService';
import './PasskeyModal.css';

interface PasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetActionName?: string;
}

export const PasskeyModal: React.FC<PasskeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetActionName = 'Door Control'
}) => {
  const [pin, setPin] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      await Haptics.impact({ style });
    } catch {}
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    triggerHaptic(ImpactStyle.Light);

    const newPin = pin + num;
    setPin(newPin);
    setHasError(false);
    setErrorMessage('');

    if (newPin.length === 4) {
      // Validate PIN
      const isValid = dbService.verifyPasskey(newPin);
      if (isValid) {
        try {
          await Haptics.notification({ type: NotificationType.Success });
        } catch {}
        dbService.logActivity('admin', 'AUTH', `Passkey verified successfully for ${targetActionName}`, 'SUCCESS');
        setTimeout(() => {
          setPin('');
          onSuccess();
        }, 150);
      } else {
        try {
          await Haptics.notification({ type: NotificationType.Error });
        } catch {}
        setHasError(true);
        setErrorMessage('Incorrect PIN. Please try again.');
        dbService.logActivity('Unknown User', 'AUTH', `Failed passkey attempt for ${targetActionName}`, 'FAILED');
        setTimeout(() => {
          setPin('');
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      triggerHaptic(ImpactStyle.Medium);
      setPin(pin.slice(0, -1));
      setHasError(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setHasError(false);
    setErrorMessage('');
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} className="passkey-modal-overlay">
      <div className="passkey-modal-card">
        <button className="passkey-close-btn" onClick={handleClose}>
          <IonIcon icon={closeOutline} />
        </button>

        <div className="passkey-header">
          <div className="passkey-icon-wrapper">
            <IonIcon icon={lockClosed} className="passkey-icon" />
          </div>
          <h2 className="passkey-title">Security Passkey</h2>
          <p className="passkey-subtitle">Enter 4-digit PIN to authorize {targetActionName}</p>
        </div>

        {/* PIN Dots */}
        <div className={`passkey-dots-container ${hasError ? 'shake-animation' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`passkey-dot ${index < pin.length ? 'filled' : ''} ${hasError ? 'error' : ''}`}
            />
          ))}
        </div>

        {errorMessage ? (
          <div className="passkey-error-text">{errorMessage}</div>
        ) : (
          <div className="passkey-hint-text">Default Testing PIN: <strong>1234</strong></div>
        )}

        {/* Numeric Keypad */}
        <div className="passkey-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="keypad-key"
              onClick={() => handleKeyPress(num.toString())}
            >
              {num}
            </button>
          ))}
          <div className="keypad-empty-slot" />
          <button
            className="keypad-key"
            onClick={() => handleKeyPress('0')}
          >
            0
          </button>
          <button
            className="keypad-key keypad-backspace"
            onClick={handleDelete}
            aria-label="Delete last digit"
          >
            <IonIcon icon={backspaceOutline} />
          </button>
        </div>
      </div>
    </IonModal>
  );
};

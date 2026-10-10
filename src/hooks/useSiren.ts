import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Haptics } from '@capacitor/haptics';

export const useSiren = () => {
  const { isAlarming, smokeActive, temperature } = useStore();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAlarming) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (!gainNodeRef.current) {
        gainNodeRef.current = audioCtxRef.current.createGain();
        gainNodeRef.current.connect(audioCtxRef.current.destination);
      }

      const ctx = audioCtxRef.current;
      const gain = gainNodeRef.current;

      const stopSound = () => {
        if (oscillatorRef.current) {
          try {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
          } catch (e) {}
          oscillatorRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      stopSound();

      if (smokeActive) {
        // Fast square wave beep (3000Hz) with sharp haptics
        let isOn = false;
        intervalRef.current = window.setInterval(() => {
          if (isOn) {
            if (oscillatorRef.current) {
              try { oscillatorRef.current.stop(); } catch (e) {}
              oscillatorRef.current = null;
            }
          } else {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(3000, ctx.currentTime);
            osc.connect(gain);
            osc.start();
            oscillatorRef.current = osc;
            
            // Smart Vibration: Sharp pulse for smoke
            Haptics.vibrate({ duration: 50 }).catch(() => {});
          }
          isOn = !isOn;
        }, 150);
      } else if (temperature >= 40) {
        // Sawtooth sweep (600Hz to 1200Hz) with continuous heavy haptic
        const playSweep = () => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
          
          const sweepGain = ctx.createGain();
          sweepGain.gain.setValueAtTime(1, ctx.currentTime);
          sweepGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
          
          osc.connect(sweepGain);
          sweepGain.connect(gain);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.4);

          // Smart Vibration: Longer heavy vibration for temp
          Haptics.vibrate({ duration: 400 }).catch(() => {});
        };
        
        playSweep();
        intervalRef.current = window.setInterval(playSweep, 500);
      }

    } else {
      // Stop alarm
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) {}
        oscillatorRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch(e) {}
      }
    };
  }, [isAlarming, smokeActive, temperature]);
};

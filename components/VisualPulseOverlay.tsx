/**
 * Visual Pulse Overlay Component
 * 
 * Displays translucent radial gradient pulses synchronized with
 * synesthetic feedback events. Works in harmony with audio cues
 * to create unified multi-sensory feedback.
 */

import React, { useState, useEffect } from 'react';
import type { SynestheticEvent } from '../services/synestheticEngine';

interface VisualPulseOverlayProps {
  event: SynestheticEvent | null;
}

export const VisualPulseOverlay: React.FC<VisualPulseOverlayProps> = ({ event }) => {
  const [isActive, setIsActive] = useState(false);
  const [color, setColor] = useState('#06b6d4');
  const [duration, setDuration] = useState(2000);

  useEffect(() => {
    if (!event) return;

    // Get visual parameters from event
    const visualFeedback = getVisualFeedback(event);
    
    setColor(visualFeedback.color);
    setDuration(visualFeedback.duration);
    setIsActive(true);

    // Auto-hide after duration (unless continuous)
    if (visualFeedback.duration > 0) {
      const timer = setTimeout(() => {
        setIsActive(false);
      }, visualFeedback.duration);

      return () => clearTimeout(timer);
    }
  }, [event]);

  // Helper to get visual parameters
  const getVisualFeedback = (evt: SynestheticEvent) => {
    switch (evt.type) {
      case 'connected':
        return { color: '#06b6d4', duration: 2000 }; // cyan
      case 'reconnecting':
        return { color: '#f59e0b', duration: 0 }; // amber, continuous
      case 'disconnected':
        return { color: '#ef4444', duration: 2000 }; // red
      case 'moodChange':
        return { color: getMoodColor(evt.data?.mood), duration: 3000 };
      case 'environmentSwitch':
        return { color: '#3b82f6', duration: 2000 }; // blue
      default:
        return { color: '#06b6d4', duration: 2000 };
    }
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'neutral': return '#06b6d4'; // cyan
      case 'positive': return '#10b981'; // green
      case 'processing': return '#8b5cf6'; // purple
      case 'alert': return '#f59e0b'; // amber
      default: return '#3b82f6'; // blue
    }
  };

  if (!isActive) return null;

  return (
    <div
      className="pulse-overlay pointer-events-none fixed inset-0 z-[49] transition-opacity duration-700"
      style={{
        opacity: isActive ? 0.6 : 0,
        background: `radial-gradient(circle at center, ${color}33, transparent 80%)`,
        animation: duration > 0 ? `lightPulse ${duration / 1000}s ease-in-out forwards` : 'none',
      }}
    />
  );
};

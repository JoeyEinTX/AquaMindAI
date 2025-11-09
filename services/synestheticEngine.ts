/**
 * Synesthetic Feedback Engine
 * 
 * Coordinates multi-sensory feedback across:
 * - Audio (via audioEngine)
 * - Visual pulses (via VisualPulseOverlay)
 * - Lighting effects (via theme/light engines)
 * 
 * Provides unified, harmonious feedback for system events
 */

import { audioEngine } from './audioEngine';
import type { ConnectionState } from '../api/hooks/useConnectionStatus';
import type { MoodTone } from './aiMoodEngine';

export type SynestheticEventType = 
  | 'connected' 
  | 'reconnecting' 
  | 'disconnected' 
  | 'moodChange' 
  | 'environmentSwitch';

export interface SynestheticEvent {
  type: SynestheticEventType;
  data?: {
    connectionState?: ConnectionState;
    mood?: MoodTone;
    energy?: number;
    environmentMode?: string;
  };
}

export interface SynestheticFeedback {
  audio: {
    toneName: string;
    loop: boolean;
  } | null;
  visual: {
    color: string;
    duration: number;
  } | null;
}

class SynestheticEngine {
  private enabled: boolean = true;
  private subscribers: Set<(event: SynestheticEvent) => void> = new Set();
  private activeReconnectingTone: boolean = false;

  constructor() {
    this.loadSettings();
  }

  /**
   * Initialize the engine and subscribe to system events
   */
  initialize(): void {
    console.log('[SYNESTHETIC] Engine initialized');
    // Subscriptions are handled by the hook
  }

  /**
   * Main trigger method for synesthetic feedback
   */
  async triggerFeedback(event: SynestheticEvent): Promise<void> {
    if (!this.enabled) {
      console.log('[SYNESTHETIC] Feedback disabled, skipping event:', event.type);
      return;
    }

    console.log('[SYNESTHETIC] Triggering feedback for event:', event.type, event.data);

    const feedback = this.getFeedbackForEvent(event);

    // Trigger audio
    if (feedback.audio) {
      if (feedback.audio.loop) {
        await audioEngine.playTone(feedback.audio.toneName, true);
        
        // Store that reconnecting tone is active
        if (event.type === 'reconnecting') {
          this.activeReconnectingTone = true;
        }
      } else {
        await audioEngine.playTone(feedback.audio.toneName, false);
      }
    }

    // Stop reconnecting tone if connection is restored
    if (event.type === 'connected' && this.activeReconnectingTone) {
      audioEngine.stopTone('reconnect_loop.mp3');
      this.activeReconnectingTone = false;
    }

    // Notify subscribers (for visual feedback)
    this.notifySubscribers(event);
  }

  /**
   * Determine feedback parameters based on event type
   */
  private getFeedbackForEvent(event: SynestheticEvent): SynestheticFeedback {
    switch (event.type) {
      case 'connected':
        return {
          audio: { toneName: 'connect_tone.wav', loop: false },
          visual: { color: '#06b6d4', duration: 2000 }, // cyan
        };

      case 'reconnecting':
        return {
          audio: { toneName: 'reconnect_loop.mp3', loop: true },
          visual: { color: '#f59e0b', duration: 0 }, // amber, continuous
        };

      case 'disconnected':
        return {
          audio: { toneName: 'disconnect_bass.wav', loop: false },
          visual: { color: '#ef4444', duration: 2000 }, // red
        };

      case 'moodChange':
        return {
          audio: { toneName: 'mood_shift.mp3', loop: false },
          visual: {
            color: this.getMoodColor(event.data?.mood),
            duration: 3000,
          },
        };

      case 'environmentSwitch':
        return {
          audio: { toneName: 'scene-whoosh', loop: false },
          visual: { color: '#3b82f6', duration: 2000 }, // blue
        };

      default:
        return { audio: null, visual: null };
    }
  }

  /**
   * Get color for AI mood
   */
  private getMoodColor(mood?: MoodTone): string {
    switch (mood) {
      case 'neutral':
        return '#06b6d4'; // cyan
      case 'positive':
        return '#10b981'; // green
      case 'processing':
        return '#8b5cf6'; // purple
      case 'alert':
        return '#f59e0b'; // amber
      default:
        return '#3b82f6'; // blue
    }
  }

  /**
   * Subscribe to synesthetic events
   */
  subscribe(callback: (event: SynestheticEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of an event
   */
  private notifySubscribers(event: SynestheticEvent): void {
    this.subscribers.forEach(callback => callback(event));
  }

  /**
   * Enable/disable synesthetic feedback
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveSettings();
    console.log('[SYNESTHETIC] Feedback', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Check if feedback is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    localStorage.setItem('synestheticSettings', JSON.stringify({
      enabled: this.enabled,
    }));
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    const saved = localStorage.getItem('synestheticSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.enabled = settings.enabled ?? true;
      } catch (error) {
        console.error('[SYNESTHETIC] Failed to load settings:', error);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.activeReconnectingTone) {
      audioEngine.stopTone('reconnect_loop.mp3');
    }
    this.subscribers.clear();
  }
}

// Singleton instance
export const synestheticEngine = new SynestheticEngine();

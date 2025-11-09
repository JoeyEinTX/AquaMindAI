/**
 * Synesthetic Feedback Hook
 * 
 * Manages synesthetic feedback by:
 * - Monitoring connection status changes
 * - Listening for AI mood changes
 * - Responding to environment switches
 * - Coordinating audio and visual feedback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { synestheticEngine, type SynestheticEvent } from '../services/synestheticEngine';
import { useConnectionStatus } from '../api/hooks/useConnectionStatus';
import { aiMoodEngine, type AIMood } from '../services/aiMoodEngine';

export function useSynestheticFeedback() {
  const [currentEvent, setCurrentEvent] = useState<SynestheticEvent | null>(null);
  const connectionStatus = useConnectionStatus();
  const previousConnectionState = useRef(connectionStatus.state);
  const previousMood = useRef<AIMood | null>(null);

  // Initialize engine on mount
  useEffect(() => {
    synestheticEngine.initialize();
    console.log('[SYNESTHETIC] Hook initialized');

    return () => {
      synestheticEngine.destroy();
    };
  }, []);

  // Subscribe to synesthetic events from the engine
  useEffect(() => {
    const unsubscribe = synestheticEngine.subscribe((event) => {
      setCurrentEvent(event);
      
      // Clear event after a brief moment to allow re-triggering
      setTimeout(() => {
        setCurrentEvent(null);
      }, 100);
    });

    return unsubscribe;
  }, []);

  // Monitor connection status changes
  useEffect(() => {
    if (connectionStatus.state !== previousConnectionState.current) {
      console.log('[SYNESTHETIC] Connection state changed:', previousConnectionState.current, '→', connectionStatus.state);
      
      synestheticEngine.triggerFeedback({
        type: connectionStatus.state,
        data: { connectionState: connectionStatus.state },
      });

      previousConnectionState.current = connectionStatus.state;
    }
  }, [connectionStatus.state]);

  // Monitor AI mood changes
  useEffect(() => {
    const handleMoodChange = (mood: AIMood) => {
      // Only trigger if mood tone actually changed
      if (previousMood.current && previousMood.current.tone !== mood.tone) {
        console.log('[SYNESTHETIC] Mood changed:', previousMood.current.tone, '→', mood.tone);
        
        synestheticEngine.triggerFeedback({
          type: 'moodChange',
          data: {
            mood: mood.tone,
            energy: mood.energy,
          },
        });
      }
      
      previousMood.current = mood;
    };

    aiMoodEngine.on('mood-change', handleMoodChange);
    
    // Get initial mood
    previousMood.current = aiMoodEngine.getMood();

    return () => {
      aiMoodEngine.off('mood-change', handleMoodChange);
    };
  }, []);

  // Listen for environment switch events
  useEffect(() => {
    const handleEnvSwitch = (event: CustomEvent) => {
      console.log('[SYNESTHETIC] Environment switched:', event.detail);
      
      synestheticEngine.triggerFeedback({
        type: 'environmentSwitch',
        data: { environmentMode: event.detail.mode },
      });
    };

    window.addEventListener('environmentSwitched' as any, handleEnvSwitch as any);

    return () => {
      window.removeEventListener('environmentSwitched' as any, handleEnvSwitch as any);
    };
  }, []);

  // Manual trigger function for special cases
  const triggerFeedback = useCallback((event: SynestheticEvent) => {
    synestheticEngine.triggerFeedback(event);
  }, []);

  // Toggle synesthetic feedback on/off
  const setEnabled = useCallback((enabled: boolean) => {
    synestheticEngine.setEnabled(enabled);
  }, []);

  const isEnabled = useCallback(() => {
    return synestheticEngine.isEnabled();
  }, []);

  return {
    currentEvent,
    triggerFeedback,
    setEnabled,
    isEnabled,
  };
}

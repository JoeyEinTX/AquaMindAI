/**
 * Network Link Effect Hook
 * 
 * Manages the display of the NetworkLinkAnimation component:
 * - Subscribes to connection state changes
 * - Listens for environment mode changes
 * - Triggers animation with throttling (max one per 5s)
 * - Returns state to control animation visibility
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConnectionStatus, type ConnectionState } from '../api/hooks/useConnectionStatus';

interface NetworkLinkState {
  shouldShow: boolean;
  connectionState: ConnectionState;
}

const THROTTLE_DELAY = 5000; // 5 seconds minimum between animations

export function useNetworkLinkEffect() {
  const [linkState, setLinkState] = useState<NetworkLinkState>({
    shouldShow: false,
    connectionState: 'connected',
  });

  const status = useConnectionStatus();
  const lastAnimationTime = useRef<number>(0);
  const previousState = useRef<ConnectionState>(status.state);

  // Throttle function to prevent animation spam
  const canShowAnimation = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAnimation = now - lastAnimationTime.current;
    return timeSinceLastAnimation >= THROTTLE_DELAY;
  }, []);

  // Trigger animation
  const triggerAnimation = useCallback((state: ConnectionState) => {
    if (!canShowAnimation()) {
      console.log('[NETWORK-LINK] Animation throttled');
      return;
    }

    console.log('[NETWORK-LINK] Triggering animation for state:', state);
    setLinkState({
      shouldShow: true,
      connectionState: state,
    });
    lastAnimationTime.current = Date.now();
  }, [canShowAnimation]);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    console.log('[NETWORK-LINK] Animation completed');
    setLinkState(prev => ({ ...prev, shouldShow: false }));
  }, []);

  // Monitor connection state changes
  useEffect(() => {
    // Only trigger if state actually changed
    if (status.state !== previousState.current) {
      console.log('[NETWORK-LINK] Connection state changed:', previousState.current, '→', status.state);
      triggerAnimation(status.state);
      previousState.current = status.state;
    }
  }, [status.state, triggerAnimation]);

  // Listen for environment mode changes
  useEffect(() => {
    const handleEnvSwitch = (event: CustomEvent) => {
      console.log('[NETWORK-LINK] Environment switched:', event.detail);
      // When environment switches, trigger animation with current state
      triggerAnimation(status.state);
    };

    // Listen for custom event from EnvironmentSwitcher
    window.addEventListener('environmentSwitched' as any, handleEnvSwitch as any);

    return () => {
      window.removeEventListener('environmentSwitched' as any, handleEnvSwitch as any);
    };
  }, [status.state, triggerAnimation]);

  return {
    ...linkState,
    onAnimationComplete: handleAnimationComplete,
  };
}

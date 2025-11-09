/**
 * Network Link Animation Component
 * 
 * Draws an animated, curved SVG "link line" that connects:
 * - Source: ConnectionStatusBadge (fixed bottom-left)
 * - Target: Network Card in Settings modal
 * 
 * Appears briefly when:
 * - Environment mode changes
 * - Connection status transitions (connected, reconnecting, disconnected)
 * 
 * Pulses or glows in color matching the new state:
 * - 🟢 Connected → Cyan glow pulse
 * - 🟡 Reconnecting → Amber dashed motion
 * - 🔴 Disconnected → Red flicker fade
 */

import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionState } from '../api/hooks/useConnectionStatus';

interface NetworkLinkAnimationProps {
  connectionState: ConnectionState;
  onAnimationComplete?: () => void;
}

export const NetworkLinkAnimation: React.FC<NetworkLinkAnimationProps> = ({
  connectionState,
  onAnimationComplete,
}) => {
  const [path, setPath] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate path between badges
  useEffect(() => {
    const calculatePath = () => {
      // Source: ConnectionStatusBadge (bottom-left)
      const sourceX = 60; // Approximate center of badge
      const sourceY = window.innerHeight - 40;

      // Target: Network section in Settings modal
      // Settings modal is centered, so target is center of screen
      const targetX = window.innerWidth / 2;
      const targetY = window.innerHeight / 2;

      // Create a curved path with slight randomization for organic feel
      const randomOffset = Math.random() * 50 - 25;
      const controlX1 = sourceX + (targetX - sourceX) * 0.3 + randomOffset;
      const controlY1 = sourceY - 100 + randomOffset;
      const controlX2 = sourceX + (targetX - sourceX) * 0.7 - randomOffset;
      const controlY2 = targetY + 50 - randomOffset;

      // Cubic Bezier curve
      const newPath = `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
      
      setPath(newPath);
      setIsVisible(true);
    };

    calculatePath();

    // Recalculate on window resize
    window.addEventListener('resize', calculatePath);
    return () => window.removeEventListener('resize', calculatePath);
  }, []);

  // Auto-fade after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500); // Wait for fade out
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  // Animation classes based on connection state
  const getAnimationClass = () => {
    switch (connectionState) {
      case 'connected':
        return 'network-link-connected';
      case 'reconnecting':
        return 'network-link-reconnecting';
      case 'disconnected':
        return 'network-link-disconnected';
      default:
        return 'network-link-connected';
    }
  };

  // Color based on connection state
  const getStrokeColor = () => {
    switch (connectionState) {
      case 'connected':
        return '#06b6d4'; // cyan-500
      case 'reconnecting':
        return '#f59e0b'; // amber-500
      case 'disconnected':
        return '#ef4444'; // red-500
      default:
        return '#06b6d4';
    }
  };

  if (!path) return null;

  return (
    <svg
      ref={svgRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none z-[55] transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ mixBlendMode: 'screen' }}
    >
      <defs>
        {/* Gaussian blur for glassy glow effect */}
        <filter id="network-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
        
        {/* Enhanced glow for connected state */}
        <filter id="network-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>

      {/* Background glow layer */}
      <path
        d={path}
        fill="none"
        stroke={getStrokeColor()}
        strokeWidth="6"
        strokeLinecap="round"
        className={`network-link-glow ${getAnimationClass()}`}
        filter="url(#network-glow-strong)"
      />

      {/* Main path */}
      <path
        d={path}
        fill="none"
        stroke={getStrokeColor()}
        strokeWidth="3"
        strokeLinecap="round"
        className={`network-link-path ${getAnimationClass()}`}
        filter="url(#network-glow)"
      />

      {/* Animated particles along the path */}
      {connectionState === 'connected' && (
        <>
          <circle r="4" fill={getStrokeColor()} filter="url(#network-glow)">
            <animateMotion dur="2s" repeatCount="1" path={path} />
          </circle>
          <circle r="4" fill={getStrokeColor()} filter="url(#network-glow)">
            <animateMotion dur="2s" begin="0.5s" repeatCount="1" path={path} />
          </circle>
        </>
      )}
    </svg>
  );
};

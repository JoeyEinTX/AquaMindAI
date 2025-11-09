/**
 * Connection Status Badge Component
 * 
 * Displays live connectivity status for backend and WebSocket
 * Fixed position in bottom-left corner with hover tooltip
 */

import React, { useState } from 'react';
import { useConnectionStatus } from '../api/hooks/useConnectionStatus';

export const ConnectionStatusBadge: React.FC = () => {
  const status = useConnectionStatus();
  const [isHovered, setIsHovered] = useState(false);

  // Color mapping for backgrounds
  const colorClasses = {
    green: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    yellow: 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300',
    red: 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300',
  };

  const glowClasses = {
    green: 'shadow-emerald-500/30',
    yellow: 'shadow-amber-500/30',
    red: 'shadow-red-500/30',
  };

  return (
    <div className="fixed bottom-3 left-3 z-50 pointer-events-auto">
      {/* Main Badge */}
      <div
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-full
          backdrop-blur-md border transition-all duration-200
          ${colorClasses[status.color]}
          ${glowClasses[status.color]}
          ${status.state === 'reconnecting' ? 'animate-pulse' : ''}
          hover:scale-105 hover:shadow-lg
          cursor-pointer
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Emoji indicator */}
        <span className="text-sm" role="img" aria-label={status.label}>
          {status.emoji}
        </span>

        {/* Status label */}
        <span className="text-xs font-medium whitespace-nowrap">
          {status.label}
        </span>

        {/* Pulsing glow effect for reconnecting state */}
        {status.state === 'reconnecting' && (
          <span className="absolute inset-0 rounded-full bg-current opacity-10 animate-ping" />
        )}
      </div>

      {/* Hover Tooltip */}
      {isHovered && (
        <div
          className="absolute bottom-full left-0 mb-2 w-48 p-3 rounded-lg
            bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-md
            border border-slate-700/50 shadow-xl
            text-xs text-slate-200
            transition-opacity duration-200"
        >
          {/* Tooltip arrow */}
          <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 
            w-2 h-2 bg-slate-800/95 dark:bg-slate-900/95 border-r border-b border-slate-700/50" />
          
          {/* Connection details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Backend:</span>
              <span className={`font-medium ${status.backendOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                {status.backendOnline ? '✓ OK' : '✗ Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">WebSocket:</span>
              <span className={`font-medium ${status.websocketOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                {status.websocketOnline ? '✓ OK' : '✗ Disconnected'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

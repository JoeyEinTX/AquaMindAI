import React, { useState, useEffect } from 'react';

type EnvMode = 'localhost' | 'lan' | 'auto';

interface EnvironmentSwitcherProps {
  addNotification: (message: string, type: 'info' | 'success' | 'ai') => void;
}

const EnvironmentSwitcher: React.FC<EnvironmentSwitcherProps> = ({ addNotification }) => {
  const [currentMode, setCurrentMode] = useState<EnvMode>('localhost');
  const [isLoading, setIsLoading] = useState(false);
  
  // Detect current environment mode on mount
  useEffect(() => {
    detectCurrentMode();
  }, []);
  
  const detectCurrentMode = () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      setCurrentMode('localhost');
    } else if (apiUrl.match(/\d+\.\d+\.\d+\.\d+/)) {
      setCurrentMode('lan');
    } else {
      setCurrentMode('auto');
    }
  };
  
  const handleModeSwitch = async (mode: EnvMode) => {
    if (mode === currentMode) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/env/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[ENV] Switched to ${mode.toUpperCase()} mode`);
        addNotification(
          `✅ Environment switched to ${mode.toUpperCase()} mode. App reloading...`,
          'success'
        );
        
        // Dispatch custom event for network link animation
        const event = new CustomEvent('environmentSwitched', { 
          detail: { mode, previousMode: currentMode } 
        });
        window.dispatchEvent(event);
        
        // Wait a moment for the user to see the notification, then reload
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        addNotification(`❌ Failed to switch environment: ${result.error}`, 'info');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[ENV] Error switching environment:', error);
      addNotification('❌ Failed to switch environment. Please try again.', 'info');
      setIsLoading(false);
    }
  };
  
  const modes: { id: EnvMode; label: string; icon: string; description: string }[] = [
    {
      id: 'localhost',
      label: 'Localhost',
      icon: '🖥️',
      description: 'Solo development (localhost:3001)',
    },
    {
      id: 'lan',
      label: 'LAN',
      icon: '🌐',
      description: 'Network access for all devices',
    },
    {
      id: 'auto',
      label: 'Auto',
      icon: '🤖',
      description: 'Automatically detect best mode',
    },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Environment Mode</h3>
        {isLoading && (
          <span className="text-xs text-blue-400 animate-pulse">Switching...</span>
        )}
      </div>
      
      <p className="text-xs text-slate-400">
        Select how AquaMind connects to the backend server
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeSwitch(mode.id)}
            disabled={isLoading || currentMode === mode.id}
            className={`
              relative p-4 rounded-lg border-2 transition-all duration-300
              ${
                currentMode === mode.id
                  ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/30 scale-105'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700 hover:scale-102'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              disabled:cursor-not-allowed disabled:opacity-60
            `}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <span className="text-3xl">{mode.icon}</span>
              <div>
                <p className={`font-semibold ${currentMode === mode.id ? 'text-blue-300' : 'text-white'}`}>
                  {mode.label}
                </p>
                <p className="text-xs text-slate-400 mt-1">{mode.description}</p>
              </div>
              
              {currentMode === mode.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      
      <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">💡 Current Mode:</span> {currentMode.toUpperCase()}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Changing environment will reload the app to apply new connection settings.
        </p>
      </div>
    </div>
  );
};

export default EnvironmentSwitcher;


import React from 'react';
import { SystemStatus, Notification } from '../types';
import { LeafIcon } from './icons/LeafIcon';
import { AlertTriangleIcon } from './icons/StatusIcons';
import { LogoutIcon } from './icons/LogoutIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BellIcon } from './icons/BellIcon';
import NotificationHistoryPopover from './NotificationHistoryPopover';

interface HeaderProps {
  systemStatus: SystemStatus;
  onLogout: () => void;
  username: string | null;
  onOpenSettings: () => void;
  notificationHistory: Notification[];
  isNotificationHistoryOpen: boolean;
  onToggleNotificationHistory: () => void;
  onClearNotificationHistory: () => void;
}

const Header: React.FC<HeaderProps> = (props) => {
  const { 
    systemStatus, onLogout, username, onOpenSettings,
    notificationHistory, isNotificationHistoryOpen, onToggleNotificationHistory, onClearNotificationHistory
  } = props;
  
  const isSystemDisabled = systemStatus === 'Disabled';

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <LeafIcon className="h-8 w-8 text-green-500" />
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                AquaMind Irrigation Controller
              </h1>
              {isSystemDisabled && (
                <span className="flex items-center space-x-1.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <AlertTriangleIcon className="w-4 h-4" />
                  <span>System Disabled</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {username && (
                <span className="text-slate-600 dark:text-slate-300 hidden sm:inline">
                    Hi, <span className="font-bold">{username}</span>!
                </span>
            )}

            <div className="relative">
                <button
                onClick={onToggleNotificationHistory}
                className="flex items-center bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 p-2.5 rounded-full transition"
                title="Notifications"
                >
                    <BellIcon className="w-5 h-5" />
                </button>
                <NotificationHistoryPopover 
                    isOpen={isNotificationHistoryOpen}
                    history={notificationHistory}
                    onClear={onClearNotificationHistory}
                />
            </div>
            
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold py-2 px-3 rounded-lg transition text-sm"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
             <button
              onClick={onLogout}
              className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold py-2 px-3 rounded-lg transition text-sm"
              title="Logout"
            >
              <LogoutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
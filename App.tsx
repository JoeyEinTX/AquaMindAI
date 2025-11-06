

import React, { useState, useEffect, useCallback } from 'react';
import { WeatherData, SprinklerZone, WateringSchedule, WateringPreference, SystemStatus, ChatMessage, DailySchedule, Notification, FollowUpAction, ScheduleEvent, User, ProactiveSuggestionResponse, NotificationAction } from './types';
import { getWeather } from './services/weatherService';
import { generateWateringSchedule, processUserChat, getProactiveSuggestions } from './services/geminiService';
import { calculateWaterUsage } from './services/waterUsageService';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LoadingOverlay from './components/LoadingOverlay';
import ManualWateringModal from './components/ManualWateringModal';
import DailyDetailModal from './components/DailyDetailModal';
import ManageZonesModal from './components/ManageZonesModal';
import ZipCodeModal from './components/ZipCodeModal';
import NotificationContainer from './components/NotificationContainer';
import Login from './components/Login';
import ApiKeySelection from './components/ApiKeySelection';
import ChatModal from './components/ChatModal';
import SettingsModal from './components/SettingsModal';

const annotateScheduleChanges = (
    baseSchedule: WateringSchedule,
    modifiedSchedule: WateringSchedule,
    adjustedBy: 'AI' | 'User',
    currentUser: string | null
): WateringSchedule => {
    const finalSchedule = JSON.parse(JSON.stringify(modifiedSchedule));
    const user = adjustedBy === 'User' ? currentUser : 'AquaMind AI';

    if (!user) return finalSchedule;

    const eventToKey = (day: string, event: ScheduleEvent) => `${day}|${event.zoneId}|${event.startTime}`;

    const baseEventsMap = new Map<string, ScheduleEvent>();
    baseSchedule.schedule.forEach(d => d.events.forEach(e => {
        // Don't consider already canceled events as a basis for new changes
        if (!e.isCanceled) {
             baseEventsMap.set(eventToKey(d.day, e), e);
        }
    }));

    const modifiedEventsMap = new Map<string, ScheduleEvent>();
    modifiedSchedule.schedule.forEach(d => d.events.forEach(e => modifiedEventsMap.set(eventToKey(d.day, e), e)));

    // Annotate new or modified events.
    // A modification of startTime is treated as a cancellation of the old event and creation of a new one.
    // This is handled by the logic below. Here we only explicitly check for new events or duration changes.
    finalSchedule.schedule.forEach((day: DailySchedule) => {
        day.events.forEach((event: ScheduleEvent) => {
            const key = eventToKey(day.day, event);
            const baseEvent = baseEventsMap.get(key);
            if (!baseEvent) { // This is a completely new event (new time for a zone).
                event.adjustment = { by: adjustedBy, user, timestamp: new Date().toISOString() };
            } else if (baseEvent.duration !== event.duration) { // Same time, but duration changed.
                event.adjustment = { by: adjustedBy, user, timestamp: new Date().toISOString() };
            }
        });
    });

    // Find events that were in the base schedule but are missing from the modified one (i.e., canceled events).
    baseEventsMap.forEach((baseEvent, key) => {
        if (!modifiedEventsMap.has(key)) {
            const [dayStr] = key.split('|');
            let targetDay = finalSchedule.schedule.find((d: DailySchedule) => d.day === dayStr);
            
            // If the day itself was removed from the schedule (e.g., AI response has no more events on that day),
            // we need to add it back to the schedule to show the cancellation.
            if (!targetDay) {
                targetDay = { day: dayStr, events: [] };
                finalSchedule.schedule.push(targetDay);
            }
            
            // Avoid adding duplicate cancellations if logic runs multiple times
            const alreadyCanceled = targetDay.events.some(e => 
                e.isCanceled && 
                e.zoneId === baseEvent.zoneId && 
                e.startTime === baseEvent.startTime
            );

            if (!alreadyCanceled) {
                targetDay.events.push({
                    ...baseEvent,
                    isCanceled: true,
                    adjustment: { by: adjustedBy, user, timestamp: new Date().toISOString() }
                });
                // Ensure events within the day are sorted by time
                targetDay.events.sort((a, b) => a.startTime.localeCompare(b.startTime));
            }
        }
    });

    // Ensure the days themselves are in chronological order after potential additions
    finalSchedule.schedule.sort((a, b) => a.day.localeCompare(b.day));

    return finalSchedule;
};


const App: React.FC = () => {
  const defaultZones: SprinklerZone[] = [
    { id: 1, name: 'Front Lawn', enabled: true, isWatering: false, relay: 1, plantType: 'Grass', sprinklerType: 'Spray', sunExposure: 'Full Sun', waterRequirement: 'Standard', headDetails: { arc180: 10, arc90: 5 } },
    { id: 2, name: 'Flower Beds', enabled: true, isWatering: false, relay: 2, plantType: 'Flowers', sprinklerType: 'Drip', sunExposure: 'Partial Shade', waterRequirement: 'Standard', flowRateGPH: 20 },
    { id: 3, name: 'Vegetable Garden', enabled: true, isWatering: false, relay: 3, plantType: 'Vegetables', sprinklerType: 'Spray', sunExposure: 'Full Sun', waterRequirement: 'High', headDetails: { arc180: 10 } },
    { id: 4, name: 'Backyard', enabled: true, isWatering: false, relay: 4, plantType: 'Grass', sprinklerType: 'Rotor', sunExposure: 'Partial Shade', waterRequirement: 'Standard', headDetails: { arc360: 4, arc180: 4 } },
  ];
  
  // DEV ONLY: Bypassed login for easier development.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<string | null>('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);

  const [zones, setZones] = useState<SprinklerZone[]>(() => {
    try {
      const savedZones = localStorage.getItem('sprinklerZones');
      if (savedZones) {
        // Basic validation to ensure it's an array
        const parsed = JSON.parse(savedZones);
        return Array.isArray(parsed) ? parsed : defaultZones;
      }
    } catch (error) {
      console.error("Failed to parse zones from localStorage", error);
    }
    return defaultZones;
  });

  const [preference, setPreference] = useState<WateringPreference>('Standard');
  const [schedule, setSchedule] = useState<WateringSchedule | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('Idle');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProactivelyChecking, setIsProactivelyChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isScheduleImplemented, setIsScheduleImplemented] = useState(false);
  const [zipCode, setZipCode] = useState<string>('75229');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualWateringModal, setManualWateringModal] = useState<{isOpen: boolean; zone: SprinklerZone | null}>({isOpen: false, zone: null});
  const [dailyDetailModal, setDailyDetailModal] = useState<{isOpen: boolean, daySchedule: DailySchedule | null}>({isOpen: false, daySchedule: null});
  const [isManageZonesModalOpen, setIsManageZonesModalOpen] = useState(false);
  const [isZipCodeModalOpen, setIsZipCodeModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>(() => {
    try {
        const savedHistory = localStorage.getItem('notificationHistory');
        return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
        return [];
    }
  });
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);
  const [followUpAction, setFollowUpAction] = useState<FollowUpAction | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Check for API Key on initial load
  useEffect(() => {
    (async () => {
        setIsApiKeySelected(await window.aistudio.hasSelectedApiKey());
    })();
  }, []);

  // Initialize users from localStorage or set default
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('aquaMindUsers');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      } else {
        const defaultUser = [{ username: 'admin', pin: '1234' }];
        localStorage.setItem('aquaMindUsers', JSON.stringify(defaultUser));
        setUsers(defaultUser);
      }
    } catch (error) {
      console.error("Failed to load users from localStorage", error);
    }
  }, []);

  // Save users to localStorage when they change
  useEffect(() => {
    // Only save if users array is not empty to avoid overwriting on initial load before hydration
    if (users.length > 0) {
      try {
        localStorage.setItem('aquaMindUsers', JSON.stringify(users));
      } catch (error) {
        console.error("Failed to save users to localStorage", error);
      }
    }
  }, [users]);

  // Check for existing session on component mount
  // DEV ONLY: Commented out to bypass login screen.
  // useEffect(() => {
  //   const sessionUser = localStorage.getItem('aquaMindCurrentUser');
  //   if (sessionUser) {
  //     setIsAuthenticated(true);
  //     setCurrentUser(sessionUser);
  //   }
  // }, []);

  // Effect to save zones to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('sprinklerZones', JSON.stringify(zones));
    } catch (error) {
      console.error("Failed to save zones to localStorage", error);
    }
  }, [zones]);

  // Effect to save notification history
  useEffect(() => {
    try {
        localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
    } catch (error) {
        console.error("Failed to save notification history", error);
    }
  }, [notificationHistory]);


  const addNotification = useCallback((message: string, type: Notification['type'], actions?: NotificationAction[]) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      type,
      actions,
    };
    // Add new notifications to the top of the list
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const dismissNotification = (id: number) => {
    const notificationToArchive = notifications.find(n => n.id === id);
    if (notificationToArchive) {
        // Add to history with a timestamp
        setNotificationHistory(prev => [
            { ...notificationToArchive, archivedAt: new Date().toISOString() }, 
            ...prev
        ]);
    }
    // Remove from active notifications
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
    addNotification('Notification history cleared.', 'success');
  };


  // Effect to manage countdown timers for manual watering.
  useEffect(() => {
    const activeWateringZone = zones.find(z => z.isWatering && z.manualWateringEndTime);
    if (!activeWateringZone) return;

    const timer = setInterval(() => {
      if (Date.now() >= activeWateringZone.manualWateringEndTime!) {
        addNotification(`Manual watering for ${activeWateringZone.name} has finished.`, 'success');
        setZones(currentZones =>
          currentZones.map(zone =>
            zone.id === activeWateringZone.id
              ? { ...zone, isWatering: false, manualWateringEndTime: undefined }
              : zone
          )
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [zones, addNotification]);

  // Effect to derive system status from the current state.
  useEffect(() => {
    if (systemStatus === 'Disabled') return;

    const activeWateringZone = zones.find(z => z.isWatering);
    if (activeWateringZone) {
      setSystemStatus(`Watering: ${activeWateringZone.name}`);
      return;
    }

    if (systemStatus.startsWith('Watering:')) {
      if (isScheduleImplemented) {
        setSystemStatus('AI Schedule Active');
      } else {
        setSystemStatus('Idle');
      }
    }
  }, [zones, systemStatus, isScheduleImplemented]);
  
  // Background proactive check
    useEffect(() => {
        if (!isScheduleImplemented || systemStatus === 'Disabled') {
            return;
        }

        const proactiveCheckInterval = setInterval(() => {
            // Prevent checks if a modal is open or another AI task is running
            const isModalOpen = manualWateringModal.isOpen || dailyDetailModal.isOpen || isManageZonesModalOpen || isZipCodeModalOpen;
            if (!isLoading && !isChatLoading && !isProactivelyChecking && !isModalOpen) {
                 handleProactiveCheck(true); // true indicates a silent background check
            }
        }, 600000); // Check every 10 minutes

        return () => clearInterval(proactiveCheckInterval);

    }, [isScheduleImplemented, systemStatus, isLoading, isChatLoading, isProactivelyChecking, manualWateringModal.isOpen, dailyDetailModal.isOpen, isManageZonesModalOpen, isZipCodeModalOpen]);


  const handleToggleSystem = useCallback(() => {
    if (systemStatus === 'Disabled') {
      const newStatus = isScheduleImplemented ? 'AI Schedule Active' : 'Idle';
      setSystemStatus(newStatus);
      addNotification('System has been re-enabled.', 'success');
    } else {
      stopManualWatering();
      setSystemStatus('Disabled');
      addNotification('System has been manually disabled.', 'info');
    }
  }, [systemStatus, isScheduleImplemented, addNotification]);
  
  const stopManualWatering = () => {
    setZones(prevZones => prevZones.map(z => ({ ...z, isWatering: false, manualWateringEndTime: undefined })));
  };
  
  useEffect(() => {
    const fetchWeather = async () => {
        if (zipCode && /^\d{5}$/.test(zipCode)) {
            setLocationError(null);
            setWeather(null); // Clear old weather to show loading state in card
            setSchedule(null); // Clear old schedule
            try {
                const weatherData = await getWeather({ zipCode });
                setWeather(weatherData);
            } catch (error) {
                console.error("Failed to fetch weather:", error);
                const errorMessage = error instanceof Error ? error.message : "Could not fetch weather data.";
                setLocationError(errorMessage);
                setWeather(null);
                setSchedule(null);
            }
        } else {
            setWeather(null);
            setSchedule(null);
            if (zipCode) {
                setLocationError("Invalid zip code. Please enter a 5-digit US zip code.");
            } else {
                setLocationError("Please provide a zip code to get weather data.");
            }
        }
    };

    if (isAuthenticated) { // Only fetch weather if logged in.
        fetchWeather();
    }
  }, [zipCode, isAuthenticated]);

    const handleAiError = (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(err);

        let userMessage = 'Failed to communicate with the AI model. Please try again.';

        if (errorMessage.includes("Requested entity was not found")) {
            userMessage = 'Your API key appears to be invalid. Please select a new one.';
            addNotification('API key is invalid. Please select a new key.', 'info');
            setIsApiKeySelected(false); // Force re-selection
        } else if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
            userMessage = 'You have exceeded your API quota. Please select a different key or wait for your quota to reset.';
            addNotification('API quota exceeded. Try selecting a different key.', 'info');
        }

        return userMessage;
    };


  const handleGenerateSchedule = useCallback(async () => {
    if (!weather) return;

    const shouldPreserveStatus = systemStatus === 'Disabled' || systemStatus.startsWith('Watering:');

    setIsLoading(true);
    setError(null);
    setChatHistory([]);
    setIsScheduleImplemented(false);

    if (!shouldPreserveStatus) {
      setSystemStatus('Optimizing');
    }

    try {
      const activeZones = zones.filter(z => z.enabled);
      
      let generatedSchedule = await generateWateringSchedule(weather, activeZones, preference, schedule, zipCode);
      generatedSchedule = calculateWaterUsage(generatedSchedule, zones);
      setSchedule(generatedSchedule);

      if (!shouldPreserveStatus) {
        setSystemStatus('Scheduled');
      }
    } catch (err) {
      const userMessage = handleAiError(err);
      setError(userMessage);
      if (!shouldPreserveStatus) {
        setSystemStatus('Error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [weather, zones, preference, systemStatus, schedule, zipCode, addNotification]);
  
  const handleProactiveCheck = async (isSilent: boolean = false) => {
        if (!isScheduleImplemented || !schedule) {
            if (!isSilent) {
                addNotification('An active schedule is required to check for suggestions.', 'info');
            }
            return;
        }
        
        setIsProactivelyChecking(true);
        try {
            // Get the latest weather to simulate a real-time check
            const latestWeather = await getWeather({ zipCode });
            
            const suggestion: ProactiveSuggestionResponse = await getProactiveSuggestions(latestWeather, zones, schedule, systemStatus, zipCode);

            if (suggestion.isAdjustmentNeeded && suggestion.newSchedule && suggestion.notificationMessage) {
                
                const handleAccept = () => {
                    if (!suggestion.newSchedule) return; // Type guard
                    const annotatedSchedule = annotateScheduleChanges(schedule, suggestion.newSchedule, 'AI', null);
                    const newScheduleWithUsage = calculateWaterUsage(annotatedSchedule, zones);
                    setSchedule(newScheduleWithUsage);
                    addNotification('AI suggestion has been applied to the schedule.', 'success');
                };

                const handleDecline = () => {
                    addNotification('AI suggestion was declined. No changes were made.', 'info');
                };

                addNotification(suggestion.notificationMessage, 'ai', [
                    { text: 'Decline', onClick: handleDecline, style: 'secondary' },
                    { text: 'Accept', onClick: handleAccept, style: 'primary' }
                ]);

            } else if (!isSilent) {
                // If it was a manual check and no changes were made
                addNotification('No critical adjustments needed at this time. Your schedule is optimized!', 'success');
            }

        } catch (e) {
            if (!isSilent) {
              handleAiError(e);
            } else {
               console.error("Failed to check for proactive suggestions:", e);
            }
        } finally {
            setIsProactivelyChecking(false);
        }
    };
  
  const handleSendMessage = async (message: string) => {
    if (!weather || !schedule) {
      addNotification('Please generate a schedule before interacting with the AI.', 'info');
      return;
    }

    const newUserMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsChatLoading(true);
    setError(null);

    try {
        const activeZones = zones.filter(z => z.enabled);
        const response = await processUserChat(weather, activeZones, preference, schedule, message, zipCode);
        
        if (response.responseType === 'answer') {
            const newModelMessage: ChatMessage = { role: 'model', content: response.answer };
            setChatHistory(prev => [...prev, newModelMessage]);
        } else if (response.responseType === 'modification') {
             const { confirmationMessage, followUpQuestion, directChangeSchedule, compensatedSchedule } = response;

            if (confirmationMessage && confirmationMessage.trim()) {
              setChatHistory(prev => [...prev, { role: 'model', content: confirmationMessage }]);
            }
            
            const userAdjustedSchedule = annotateScheduleChanges(schedule, directChangeSchedule, 'User', currentUser);
            const scheduleWithUsage = calculateWaterUsage(userAdjustedSchedule, zones);

            setSchedule(scheduleWithUsage);
            setIsScheduleImplemented(true);
            if (systemStatus !== 'Disabled' && !systemStatus.startsWith('Watering:')) {
                setSystemStatus('AI Schedule Active');
            }

            if (followUpQuestion && compensatedSchedule) {
              const compensatedWithAnnotations = annotateScheduleChanges(userAdjustedSchedule, compensatedSchedule, 'AI', null);
              const compensatedWithUsage = calculateWaterUsage(compensatedWithAnnotations, zones);
              setFollowUpAction({
                  question: followUpQuestion,
                  compensatedSchedule: compensatedWithUsage
              });
            }
        }
    } catch (err) {
        const userMessage = handleAiError(err);
        const errorMessage: ChatMessage = { role: 'model', content: `Sorry, I couldn't process that. ${userMessage}` };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsChatLoading(false);
    }
  };
  
  const handleFollowUpResponse = (accepted: boolean) => {
    if (!followUpAction) return;
    
    if (accepted) {
        setSchedule(followUpAction.compensatedSchedule);
        addNotification('Schedule has been updated with the AI suggestion.', 'success');
        setChatHistory(prev => [...prev, {role: 'model', content: "Great! I've updated the schedule with that adjustment."}])
    } else {
        addNotification('No additional changes were made.', 'info');
        setChatHistory(prev => [...prev, {role: 'model', content: "Okay, I've left the schedule as is."}])
    }
    setFollowUpAction(null);
  };

  const handleImplementSchedule = () => {
    if (systemStatus === 'Disabled') {
        addNotification('Cannot implement schedule while system is disabled.', 'info');
        return;
    }
    setIsScheduleImplemented(true);
    if (!zones.some(z => z.isWatering)) {
      setSystemStatus('AI Schedule Active');
    }
  };

  const handleOpenManualWateringModal = (zoneId: number) => {
    if (systemStatus === 'Disabled') {
        addNotification('Cannot start manual watering while system is disabled.', 'info');
        return;
    }
    const zoneToWater = zones.find(z => z.id === zoneId);
    if (zoneToWater) {
      if (zoneToWater.isWatering) {
        setZones(zones.map(z => z.id === zoneId ? { ...z, isWatering: false, manualWateringEndTime: undefined } : z));
        addNotification(`Manual watering for ${zoneToWater.name} stopped.`, 'info');
      } else {
        setManualWateringModal({ isOpen: true, zone: zoneToWater });
      }
    }
  };

  const handleStartManualWatering = (durationMinutes: number) => {
    if (!manualWateringModal.zone) return;

    const endTime = Date.now() + durationMinutes * 60 * 1000;
    
    setZones(prevZones =>
      prevZones.map(zone => {
        if (zone.id === manualWateringModal.zone?.id) {
          return { ...zone, isWatering: true, manualWateringEndTime: endTime };
        }
        return { ...zone, isWatering: false, manualWateringEndTime: undefined };
      })
    );
    addNotification(`Started manual watering for ${manualWateringModal.zone.name} for ${durationMinutes} minutes.`, 'info');
    setManualWateringModal({ isOpen: false, zone: null });
  };

  const handleOpenDailyDetail = (daySchedule: DailySchedule) => {
    setDailyDetailModal({ isOpen: true, daySchedule });
  };

  const handleAddZone = (zoneData: Omit<SprinklerZone, 'id' | 'isWatering'>) => {
      const newZone: SprinklerZone = {
          ...zoneData,
          id: Date.now(),
          isWatering: false,
      };
      setZones(prevZones => [...prevZones, newZone]);
  };

  const handleUpdateZone = (updatedZone: SprinklerZone) => {
      setZones(prevZones => prevZones.map(z => z.id === updatedZone.id ? { ...z, ...updatedZone } : z));
  };

  const handleDeleteZone = (zoneId: number) => {
      const zoneToDelete = zones.find(z => z.id === zoneId);
      if (zoneToDelete?.isWatering) {
          stopManualWatering();
      }
      setZones(prevZones => prevZones.filter(z => z.id !== zoneId));
  };

  const handleLocationUpdate = (newZipCode: string) => {
    setZipCode(newZipCode);
    setIsZipCodeModalOpen(false);
  };

  const handleLogin = (username: string, pin: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin);
    if (user) {
      localStorage.setItem('aquaMindCurrentUser', user.username);
      setIsAuthenticated(true);
      setCurrentUser(user.username);
      return true;
    }
    return false;
  };

  const handleCreateUser = (username: string, pin: string): { success: boolean; message: string } => {
    if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username already exists. Please choose another.' };
    }
    const newUser: User = { username, pin };
    setUsers(prevUsers => [...prevUsers, newUser]);
    return { success: true, message: 'Account created successfully! You can now log in.' };
  };
  
  const handleDeleteUser = (usernameToDelete: string): { success: boolean; message: string } => {
    if (users.length <= 1) {
      return { success: false, message: "Cannot delete the only user account." };
    }
    if (usernameToDelete === currentUser) {
      return { success: false, message: "Cannot delete the currently logged-in user." };
    }
    setUsers(prevUsers => prevUsers.filter(user => user.username !== usernameToDelete));
    return { success: true, message: `User "${usernameToDelete}" has been deleted.` };
  };

  const handleLogout = () => {
    localStorage.removeItem('aquaMindCurrentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300">
        {!isApiKeySelected ? (
            <ApiKeySelection onKeySelected={() => setIsApiKeySelected(true)} />
        ) : !isAuthenticated ? (
            <Login onLogin={handleLogin} onCreateUser={handleCreateUser} />
        ) : (
            <>
                <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
                <Header 
                    systemStatus={systemStatus}
                    onLogout={handleLogout}
                    username={currentUser}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    notificationHistory={notificationHistory}
                    isNotificationHistoryOpen={isNotificationHistoryOpen}
                    onToggleNotificationHistory={() => setIsNotificationHistoryOpen(prev => !prev)}
                    onClearNotificationHistory={clearNotificationHistory}
                />
                <main className="p-4 sm:p-6 max-w-7xl mx-auto">
                    {isLoading && <LoadingOverlay />}
                    {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                    )}
                    <Dashboard
                    isLoading={isLoading}
                    isProactivelyChecking={isProactivelyChecking}
                    weather={weather}
                    zones={zones}
                    preference={preference}
                    setPreference={setPreference}
                    schedule={schedule}
                    systemStatus={systemStatus}
                    onGenerateSchedule={handleGenerateSchedule}
                    onOpenManualWateringModal={handleOpenManualWateringModal}
                    onToggleSystem={handleToggleSystem}
                    isScheduleImplemented={isScheduleImplemented}
                    onImplementSchedule={handleImplementSchedule}
                    zipCode={zipCode}
                    locationError={locationError}
                    onEditLocation={() => setIsZipCodeModalOpen(true)}
                    onOpenManageZonesModal={() => setIsManageZonesModalOpen(true)}
                    onProactiveCheck={() => handleProactiveCheck(false)}
                    onOpenChatModal={() => setIsChatModalOpen(true)}
                    onDayClick={handleOpenDailyDetail}
                    />
                </main>
                
                <ChatModal
                    isOpen={isChatModalOpen}
                    onClose={() => setIsChatModalOpen(false)}
                    chatHistory={chatHistory}
                    isChatLoading={isChatLoading}
                    onSendMessage={handleSendMessage}
                    followUpAction={followUpAction}
                    onFollowUpResponse={handleFollowUpResponse}
                />

                <ManualWateringModal
                    isOpen={manualWateringModal.isOpen}
                    zoneName={manualWateringModal.zone?.name || ''}
                    onClose={() => setManualWateringModal({ isOpen: false, zone: null })}
                    onStart={handleStartManualWatering}
                />
                <DailyDetailModal
                    isOpen={dailyDetailModal.isOpen}
                    onClose={() => setDailyDetailModal({isOpen: false, daySchedule: null})}
                    daySchedule={dailyDetailModal.daySchedule}
                    zones={zones}
                    systemStatus={systemStatus}
                />
                <ManageZonesModal
                    isOpen={isManageZonesModalOpen}
                    onClose={() => setIsManageZonesModalOpen(false)}
                    zones={zones}
                    onAddZone={handleAddZone}
                    onUpdateZone={handleUpdateZone}
                    onDeleteZone={handleDeleteZone}
                />
                <ZipCodeModal
                    isOpen={isZipCodeModalOpen}
                    onClose={() => setIsZipCodeModalOpen(false)}
                    onSubmit={handleLocationUpdate}
                    currentZipCode={zipCode}
                />
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    users={users}
                    currentUser={currentUser}
                    onCreateUser={handleCreateUser}
                    onDeleteUser={handleDeleteUser}
                    addNotification={addNotification}
                />
            </>
        )}
    </div>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { UsersIcon } from './icons/UsersIcon';
import { WifiIcon } from './icons/WifiIcon';
import { ServerIcon } from './icons/ServerIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import EnvironmentSwitcher from './EnvironmentSwitcher';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    currentUser: string | null;
    onCreateUser: (username: string, pin: string) => { success: boolean; message: string };
    onDeleteUser: (username: string) => { success: boolean; message: string };
    addNotification: (message: string, type: 'info' | 'success' | 'ai') => void;
}

const SettingsModal: React.FC<SettingsModalProps> = (props) => {
    const { isOpen, onClose, users, currentUser, onCreateUser, onDeleteUser, addNotification } = props;
    const [activeTab, setActiveTab] = useState<'users' | 'interaction' | 'network' | 'system'>('users');
    
    // State for the "Add User" form
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // State for interaction settings
    const [rippleIntensity, setRippleIntensity] = useState<'off' | 'subtle' | 'normal'>('normal');
    const [motionEffects, setMotionEffects] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [synestheticEnabled, setSynestheticEnabled] = useState(true);
    
    // Load interaction settings from localStorage
    useEffect(() => {
        const savedRipple = localStorage.getItem('rippleIntensity') as 'off' | 'subtle' | 'normal';
        if (savedRipple) setRippleIntensity(savedRipple);
        
        const savedMotion = localStorage.getItem('motionEffects');
        if (savedMotion !== null) setMotionEffects(savedMotion === 'true');
        
        const savedHaptics = localStorage.getItem('hapticsEnabled');
        if (savedHaptics !== null) setHapticsEnabled(savedHaptics === 'true');
        
        const savedSynesthetic = localStorage.getItem('synestheticSettings');
        if (savedSynesthetic) {
            try {
                const settings = JSON.parse(savedSynesthetic);
                setSynestheticEnabled(settings.enabled ?? true);
            } catch (e) {
                setSynestheticEnabled(true);
            }
        }
    }, []);
    
    const handleRippleChange = (value: 'off' | 'subtle' | 'normal') => {
        setRippleIntensity(value);
        localStorage.setItem('rippleIntensity', value);
        console.log('[RIPPLE] Intensity changed to', value);
        addNotification(`Ripple effects ${value === 'off' ? 'disabled' : `set to ${value}`}`, 'success');
        // Trigger storage event for other components
        window.dispatchEvent(new Event('storage'));
    };
    
    const handleMotionToggle = () => {
        const newValue = !motionEffects;
        setMotionEffects(newValue);
        localStorage.setItem('motionEffects', String(newValue));
        console.log('[MOTION] Effects toggled to', newValue);
        addNotification(`Motion effects ${newValue ? 'enabled' : 'disabled'}`, 'success');
        // Trigger storage event for other components
        window.dispatchEvent(new Event('storage'));
    };
    
    const handleHapticsToggle = () => {
        const newValue = !hapticsEnabled;
        setHapticsEnabled(newValue);
        localStorage.setItem('hapticsEnabled', String(newValue));
        console.log('[HAPTICS] Toggled to', newValue);
        addNotification(`Haptic feedback ${newValue ? 'enabled' : 'disabled'}`, 'success');
    };
    
    const handleSynestheticToggle = () => {
        const newValue = !synestheticEnabled;
        setSynestheticEnabled(newValue);
        localStorage.setItem('synestheticSettings', JSON.stringify({ enabled: newValue }));
        console.log('[SYNESTHETIC] Toggled to', newValue);
        addNotification(`Multi-sensory feedback ${newValue ? 'enabled' : 'disabled'}`, 'success');
        // Trigger storage event to update the engine
        window.dispatchEvent(new Event('storage'));
    };

    if (!isOpen) return null;

    const handleAddUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormMessage(null);
        if (newPin !== confirmPin) {
            setFormMessage({ type: 'error', text: "PINs do not match." });
            return;
        }
        const result = onCreateUser(newUsername, newPin);
        setFormMessage({ type: result.success ? 'success' : 'error', text: result.message });
        if (result.success) {
            addNotification(`User "${newUsername}" created successfully.`, 'success');
            setNewUsername('');
            setNewPin('');
            setConfirmPin('');
            setIsAddingUser(false);
        }
    };
    
    const handleDeleteClick = (username: string) => {
        if (window.confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
            const result = onDeleteUser(username);
            addNotification(result.message, result.success ? 'success' : 'info');
        }
    };

    const renderUsersTab = () => (
        <div className="space-y-4">
            {isAddingUser ? (
                <form onSubmit={handleAddUserSubmit} className="p-4 bg-slate-700/50 rounded-lg space-y-4">
                    <h4 className="font-bold text-lg text-white">Add New User</h4>
                    <input
                        type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required
                        placeholder="Username"
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
                    />
                    <input
                        type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} required maxLength={4} pattern="\d{4}"
                        placeholder="4-Digit PIN"
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
                    />
                    <input
                        type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} required maxLength={4} pattern="\d{4}"
                        placeholder="Confirm PIN"
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2"
                    />
                    {formMessage && <p className={`text-sm ${formMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{formMessage.text}</p>}
                    <div className="flex justify-end space-x-2">
                        <button type="button" onClick={() => setIsAddingUser(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg">Save User</button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-lg text-white">User Accounts</h4>
                        <button onClick={() => { setIsAddingUser(true); setFormMessage(null); }} className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg">
                            <PlusIcon className="w-5 h-5"/>
                            <span>Add User</span>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {users.map(user => (
                            <div key={user.username} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{user.username}</p>
                                    <p className="text-xs text-slate-400">PIN: ****</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteClick(user.username)}
                                    disabled={user.username === currentUser || users.length <= 1}
                                    className="p-2 text-slate-400 hover:text-red-400 rounded-full hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                    title={user.username === currentUser ? "Cannot delete yourself" : users.length <= 1 ? "Cannot delete the only user" : "Delete user"}
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    const renderNetworkTab = () => (
        <div className="space-y-6">
             {/* Environment Mode Switcher */}
             <EnvironmentSwitcher addNotification={addNotification} />
             
             {/* Network Info Section */}
             <div>
                 <h4 className="font-bold text-lg text-white mb-4">Device & Network</h4>
                 <div className="p-4 bg-slate-700/50 rounded-lg">
                    <p className="text-sm font-medium text-slate-400 mb-2">Current Connection</p>
                    <div className="flex items-center space-x-3 text-white">
                        <WifiIcon className="w-6 h-6 text-green-400"/>
                        <div>
                            <p className="font-semibold">HomeNetwork-5G</p>
                            <p className="text-xs text-slate-300">IP: 192.168.1.123</p>
                        </div>
                    </div>
                 </div>
                 <button
                    onClick={() => addNotification('Network scanning is a simulated feature.', 'info')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-lg mt-4"
                 >
                    Change Wi-Fi Network
                </button>
             </div>
        </div>
    );

    const renderInteractionTab = () => (
        <div className="space-y-6">
            <h4 className="font-bold text-lg text-white">Interaction Effects</h4>
            
            {/* Ripple Intensity */}
            <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                <label className="block text-sm font-medium text-white">
                    Ripple Intensity
                </label>
                <p className="text-xs text-slate-400 mb-2">
                    Visual feedback when clicking interactive elements
                </p>
                <select 
                    value={rippleIntensity}
                    onChange={(e) => handleRippleChange(e.target.value as 'off' | 'subtle' | 'normal')}
                    className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="off">Off</option>
                    <option value="subtle">Subtle</option>
                    <option value="normal">Normal</option>
                </select>
            </div>
            
            {/* Motion Depth (Parallax) */}
            <div className="p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="block text-sm font-medium text-white">
                            Motion Depth (Parallax)
                        </label>
                        <p className="text-xs text-slate-400 mt-1">
                            Background responds to cursor/device tilt
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={motionEffects}
                            onChange={handleMotionToggle}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            
            {/* Haptic Feedback */}
            <div className="p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="block text-sm font-medium text-white">
                            Haptic Feedback
                        </label>
                        <p className="text-xs text-slate-400 mt-1">
                            Vibration on touch interactions (mobile)
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={hapticsEnabled}
                            onChange={handleHapticsToggle}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            
            {/* Synesthetic Feedback */}
            <div className="p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="block text-sm font-medium text-white">
                            Multi-Sensory Feedback
                        </label>
                        <p className="text-xs text-slate-400 mt-1">
                            Unified audio-visual cues for system events
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={synestheticEnabled}
                            onChange={handleSynestheticToggle}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
            
            <p className="text-xs text-slate-400 italic">
                💡 These effects enhance interactivity. Disable for better performance or accessibility.
            </p>
        </div>
    );

    const renderSystemTab = () => (
         <div className="space-y-4">
            <h4 className="font-bold text-lg text-white">System Actions</h4>
            <button
                onClick={() => { addNotification('Simulating device reboot...', 'info'); onClose(); }}
                className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-white"
            >
                Reboot Device
            </button>
            <button
                onClick={() => addNotification('You are on the latest version.', 'success')}
                className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-white"
            >
                Check for Updates
            </button>
             <button
                onClick={() => {
                    if (window.confirm('Are you sure you want to factory reset? All settings, users, and zones will be deleted. This cannot be undone.')) {
                        addNotification('Simulating factory reset. Application will now be in a default state.', 'info');
                        // In a real app, you would clear localStorage and reset state here.
                        onClose();
                    }
                }}
                className="w-full text-left p-3 bg-red-900/40 hover:bg-red-900/60 rounded-lg text-red-300 font-semibold"
            >
                Factory Reset
            </button>
         </div>
    );
    
    const tabs = [
        { id: 'users', label: 'Users', icon: UsersIcon, content: renderUsersTab() },
        { id: 'interaction', label: 'Interaction', icon: SparklesIcon, content: renderInteractionTab() },
        { id: 'network', label: 'Network', icon: WifiIcon, content: renderNetworkTab() },
        { id: 'system', label: 'System', icon: ServerIcon, content: renderSystemTab() },
    ] as const;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-md p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg mx-auto border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex items-center mb-6">
                    <SettingsIcon className="w-6 h-6 mr-3 text-blue-400" />
                    <h2 className="text-2xl font-bold text-blue-400">Settings</h2>
                </div>
                
                <div className="flex border-b border-slate-700 mb-6">
                    {tabs.map(tab => (
                         <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-white'
                            }`}
                        >
                            <tab.icon className="w-5 h-5"/>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="min-h-[250px]">
                    {tabs.find(t => t.id === activeTab)?.content}
                </div>

                <div className="flex justify-end mt-8 pt-6 border-t border-slate-700">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Close</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

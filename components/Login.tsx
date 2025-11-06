
import React, { useState } from 'react';
import { LeafIcon } from './icons/LeafIcon';

interface LoginProps {
    onLogin: (username: string, pin: string) => boolean;
    onCreateUser: (username: string, pin: string) => { success: boolean; message: string };
}

const Login: React.FC<LoginProps> = ({ onLogin, onCreateUser }) => {
    const [view, setView] = useState<'login' | 'signup'>('login');
    
    // Login state
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPin, setLoginPin] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    
    // Signup state
    const [newUsername, setNewUsername] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [signupMessage, setSignupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSignupLoading, setIsSignupLoading] = useState(false);


    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setIsLoginLoading(true);

        setTimeout(() => {
            const success = onLogin(loginUsername, loginPin);
            if (!success) {
                setLoginError('Invalid username or PIN. Please try again.');
                setIsLoginLoading(false);
                setLoginPin('');
            }
        }, 500);
    };

    const handleSignupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSignupMessage(null);
        if (newPin !== confirmPin) {
            setSignupMessage({ type: 'error', text: 'PINs do not match. Please re-enter.' });
            return;
        }
        setIsSignupLoading(true);

        setTimeout(() => {
            const result = onCreateUser(newUsername, newPin);
            setSignupMessage({ type: result.success ? 'success' : 'error', text: result.message });
            setIsSignupLoading(false);
            if (result.success) {
                setNewUsername('');
                setNewPin('');
                setConfirmPin('');
                setTimeout(() => {
                    setView('login');
                    setSignupMessage(null);
                }, 2000);
            }
        }, 500);
    };

    const resetForms = () => {
        setLoginUsername('');
        setLoginPin('');
        setLoginError(null);
        setNewUsername('');
        setNewPin('');
        setConfirmPin('');
        setSignupMessage(null);
    }

    const switchView = (newView: 'login' | 'signup') => {
        resetForms();
        setView(newView);
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm p-8 space-y-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700">
                <div className="text-center">
                    <LeafIcon className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        AquaMind AI
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {view === 'login' ? 'Please sign in to continue' : 'Create a new account'}
                    </p>
                </div>
                
                {view === 'login' ? (
                    <form className="space-y-6" onSubmit={handleLoginSubmit}>
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <label htmlFor="pin" className="sr-only">PIN</label>
                            <input
                                id="pin"
                                name="pin"
                                type="password"
                                autoComplete="current-password"
                                required
                                maxLength={4}
                                pattern="\d{4}"
                                value={loginPin}
                                onChange={(e) => setLoginPin(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                placeholder="4-Digit PIN"
                            />
                        </div>
                        {loginError && (
                            <p className="text-sm text-red-500 text-center">{loginError}</p>
                        )}
                        <div>
                            <button
                                type="submit"
                                disabled={isLoginLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:bg-slate-400"
                            >
                                {isLoginLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                        <p className="text-xs text-center text-slate-500">
                            Don't have an account?{' '}
                            <button type="button" onClick={() => switchView('signup')} className="font-medium text-blue-500 hover:text-blue-400">
                                Create one
                            </button>
                        </p>
                    </form>
                ) : (
                    <form className="space-y-4" onSubmit={handleSignupSubmit}>
                        <input
                            type="text"
                            required
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            placeholder="New Username"
                        />
                        <input
                            type="password"
                            required
                            maxLength={4}
                            pattern="\d{4}"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            placeholder="4-Digit PIN"
                        />
                        <input
                            type="password"
                            required
                            maxLength={4}
                            pattern="\d{4}"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                            placeholder="Confirm PIN"
                        />
                        {signupMessage && (
                            <p className={`text-sm text-center ${signupMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{signupMessage.text}</p>
                        )}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSignupLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition disabled:bg-slate-400"
                            >
                                {isSignupLoading ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                         <p className="text-xs text-center text-slate-500">
                            Already have an account?{' '}
                            <button type="button" onClick={() => switchView('login')} className="font-medium text-blue-500 hover:text-blue-400">
                                Sign In
                            </button>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;

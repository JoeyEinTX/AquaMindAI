import React from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { LeafIcon } from './icons/LeafIcon';

interface ApiKeySelectionProps {
    onKeySelected: () => void;
}

const ApiKeySelection: React.FC<ApiKeySelectionProps> = ({ onKeySelected }) => {
    
    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            // Assume success and let the parent component re-check.
            onKeySelected();
        } catch (e) {
            console.error("Error opening API key selection:", e);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-8 space-y-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700 text-center">
                 <LeafIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                    Welcome to AquaMind AI
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    To get started, please select a Google AI Studio API key. This will be used to power the smart scheduling and chat features.
                </p>
                <div>
                     <button
                        onClick={handleSelectKey}
                        className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                    >
                        <KeyIcon className="w-5 h-5 mr-2" />
                        Select API Key
                    </button>
                </div>
                 <p className="text-xs text-slate-400 dark:text-slate-500">
                    Your API key is stored securely and only used for interacting with the Gemini API. For information on pricing and usage, please refer to the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">official billing documentation</a>.
                </p>
            </div>
        </div>
    );
};

export default ApiKeySelection;

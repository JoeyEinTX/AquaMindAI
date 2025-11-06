import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, FollowUpAction } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { SendIcon } from './icons/SendIcon';
import { LeafIcon } from './icons/LeafIcon';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatHistory: ChatMessage[];
    isChatLoading: boolean;
    onSendMessage: (message: string) => void;
    followUpAction: FollowUpAction | null;
    onFollowUpResponse: (accepted: boolean) => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
    isOpen,
    onClose,
    chatHistory,
    isChatLoading,
    onSendMessage,
    followUpAction,
    onFollowUpResponse,
}) => {
    const [message, setMessage] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll chat history
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, followUpAction, isChatLoading]);
    
    // Auto-focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100); // Small delay to allow for modal transition
        } else {
            setMessage(''); // Clear message when closing
        }
    }, [isOpen]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !isChatLoading) {
            onSendMessage(message);
            setMessage('');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-md p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto border border-slate-700 transform transition-all flex flex-col h-[80vh] max-h-[700px]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center">
                        <SparklesIcon className="w-6 h-6 mr-3 text-blue-400" />
                        <h2 className="text-xl font-bold text-blue-400">Ask AquaMind AI</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 rounded-full hover:bg-slate-700 hover:text-slate-200 transition"
                        aria-label="Close chat"
                    >
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                
                <main ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {chatHistory.length === 0 && !isChatLoading && (
                        <div className="text-center text-slate-400 pt-16">
                            <p>Ask a question or give a command, like:</p>
                            <p className="italic mt-2">"Cancel watering for the front lawn tomorrow"</p>
                        </div>
                    )}
                    {chatHistory.map((chat, index) => (
                        <div key={index} className={`flex items-start gap-3 ${chat.role === 'user' ? 'justify-end' : ''}`}>
                            {chat.role === 'model' && (
                               <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                   <LeafIcon className="w-5 h-5 text-white" />
                               </div>
                            )}
                            <div className={`px-4 py-2 rounded-xl max-w-sm md:max-w-md break-words ${chat.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                               <p className="text-sm">{chat.content}</p>
                            </div>
                        </div>
                    ))}
                    {followUpAction && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                               <LeafIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-xl bg-slate-700 text-slate-200 rounded-bl-none">
                               <p className="text-sm mb-3">{followUpAction.question}</p>
                               <div className="flex space-x-2">
                                   <button onClick={() => onFollowUpResponse(true)} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-1 px-3 rounded-lg transition">Yes, adjust</button>
                                   <button onClick={() => onFollowUpResponse(false)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm font-bold py-1 px-3 rounded-lg transition">No, thanks</button>
                               </div>
                            </div>
                        </div>
                    )}
                    {isChatLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                               <LeafIcon className="w-5 h-5 text-white animate-pulse" />
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-slate-700 rounded-bl-none">
                               <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                               </div>
                            </div>
                        </div>
                    )}
                </main>
                
                <footer className="p-4 border-t border-slate-700 flex-shrink-0">
                    <form onSubmit={handleFormSubmit} className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Modify schedule or ask a question..."
                            className="flex-grow bg-slate-700 border border-slate-600 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            disabled={isChatLoading || !!followUpAction}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isChatLoading || !message.trim() || !!followUpAction}
                            aria-label="Send message"
                        >
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default ChatModal;

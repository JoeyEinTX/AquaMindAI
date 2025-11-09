import React, { useState, useRef, useEffect } from 'react';
import { useAssistantChat, ChatMessage } from '../api/hooks/useAssistantChat';
import { useVoiceRecognition } from '../api/hooks/useVoiceRecognition';
import { ttsService } from '../services/ttsService';
import { SparklesIcon } from './icons/SparklesIcon';
import { SendIcon } from './icons/SendIcon';

export const AssistantPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceModeEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { messages, isLoading, sendMessage, confirmAction, clearMessages } = useAssistantChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Voice recognition hook
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isVoiceSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition(
    async (finalTranscript) => {
      if (finalTranscript.trim()) {
        await sendMessage(finalTranscript);
        resetTranscript();
      }
    },
    {
      continuous: false,
      interimResults: true
    }
  );

  // Save voice mode preference
  useEffect(() => {
    localStorage.setItem('voiceModeEnabled', JSON.stringify(voiceModeEnabled));
    ttsService.setEnabled(voiceModeEnabled);
  }, [voiceModeEnabled]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle TTS for new assistant messages
  useEffect(() => {
    if (voiceModeEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !isLoading) {
        // Speak the response
        setIsSpeaking(true);
        ttsService.speak(lastMessage.content)
          .then(() => setIsSpeaking(false))
          .catch((err) => {
            console.error('TTS error:', err);
            setIsSpeaking(false);
          });
      }
    }
  }, [messages, voiceModeEnabled, isLoading]);

  // Update input value from voice recognition
  useEffect(() => {
    if (isListening && (transcript || interimTranscript)) {
      setInputValue(transcript + interimTranscript);
    }
  }, [transcript, interimTranscript, isListening]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Stop any ongoing speech
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }

    const message = inputValue.trim();
    setInputValue('');
    
    // Resize textarea back to single line
    if (inputRef.current) {
      inputRef.current.style.height = '40px';
    }

    await sendMessage(message);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      // Stop any ongoing speech
      if (isSpeaking) {
        ttsService.stop();
        setIsSpeaking(false);
      }
      startListening();
    }
  };

  const handleStopSpeaking = () => {
    ttsService.stop();
    setIsSpeaking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Sanitize input - remove HTML tags
    const sanitized = value.replace(/<[^>]*>/g, '');
    setInputValue(sanitized);

    // Auto-resize textarea
    const target = e.target;
    target.style.height = '40px';
    const scrollHeight = target.scrollHeight;
    target.style.height = Math.min(scrollHeight, 120) + 'px';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const togglePanel = () => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 200);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {(isOpen || isAnimating) && (
        <div className={`mb-4 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 transition-all duration-200 ${
          isOpen && !isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">AquaMind AI</h3>
                <p className="text-blue-100 text-xs">Your irrigation assistant</p>
              </div>
            </div>
            <button
              onClick={togglePanel}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SparklesIcon className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600 text-sm mb-2">Hi! I'm your AquaMind AI assistant.</p>
                <p className="text-gray-500 text-xs">Ask me about your system status, recent runs, schedules, or anything else!</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.actionExecuted
                        ? 'bg-green-50 text-gray-800 shadow-sm border border-green-200'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                    }`}
                  >
                    {/* Action Executed Indicator */}
                    {message.actionExecuted && message.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-2 text-green-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-xs font-semibold">Action Executed</span>
                      </div>
                    )}
                    
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    
                    {/* Confirmation Buttons */}
                    {message.requiresConfirmation && message.role === 'assistant' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                        <button
                          onClick={() => confirmAction(message.id)}
                          disabled={isLoading}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            // Just acknowledge - no action needed
                            setInputValue('');
                          }}
                          disabled={isLoading}
                          className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs text-gray-500 mt-1 px-1 ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            {/* Voice mode toggle and status */}
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceModeEnabled}
                  onChange={(e) => setVoiceModeEnabled(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span>Voice Mode</span>
              </label>
              
              {/* Voice status indicators */}
              {voiceModeEnabled && (
                <div className="flex items-center gap-2">
                  {isListening && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                      Listening...
                    </span>
                  )}
                  {isSpeaking && (
                    <button
                      onClick={handleStopSpeaking}
                      className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                      <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                      Speaking (click to stop)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Voice error display */}
            {voiceError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {voiceError}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                disabled={isLoading || isListening}
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                style={{ minHeight: '40px', maxHeight: '120px' }}
                rows={1}
              />
              
              {/* Microphone button */}
              {voiceModeEnabled && isVoiceSupported && (
                <button
                  onClick={handleVoiceToggle}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    {isListening ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    )}
                  </svg>
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || isListening}
                className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-label="Send message"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to send
              {voiceModeEnabled && isVoiceSupported && (
                <>, or use <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs ml-1">🎤</kbd> for voice</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={togglePanel}
        className={`w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center group ${
          isOpen ? 'rotate-180' : 'rotate-0'
        }`}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        ) : (
          <SparklesIcon className="w-7 h-7 group-hover:scale-110 transition-transform duration-200" />
        )}
      </button>

      {/* Pulse indicator when not open */}
      {!isOpen && !isAnimating && (
        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
      )}
    </div>
  );
};

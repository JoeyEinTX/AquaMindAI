import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actionExecuted?: boolean;
  requiresConfirmation?: boolean;
  pendingAction?: {
    intent: string;
    parameters: Record<string, any>;
  };
}

export interface UseAssistantChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (prompt: string) => Promise<void>;
  confirmAction: (messageId: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAssistantChat(): UseAssistantChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        success: boolean;
        response: string;
        message?: string;
        intent?: string;
        parameters?: Record<string, any>;
        requiresConfirmation?: boolean;
        actionExecuted?: boolean;
      }>(
        '/ai/chat',
        { prompt: prompt.trim() },
        { signal: abortControllerRef.current.signal }
      );

      if (response.success && response.response) {
        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          actionExecuted: response.actionExecuted,
          requiresConfirmation: response.requiresConfirmation,
          pendingAction: response.requiresConfirmation ? {
            intent: response.intent!,
            parameters: response.parameters!
          } : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.message || 'Failed to get response');
      }
    } catch (err: any) {
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to send message';
      setError(errorMessage);

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const confirmAction = useCallback(async (messageId: string) => {
    // Find the message with pending action
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.pendingAction) {
      console.error('No pending action found for message:', messageId);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await apiClient.post<{
        success: boolean;
        response: string;
        message?: string;
        actionExecuted?: boolean;
      }>(
        '/ai/chat',
        {
          prompt: 'Confirmed',
          confirmAction: message.pendingAction
        },
        { signal: abortControllerRef.current.signal }
      );

      if (response.success && response.response) {
        // Add confirmation result message
        const resultMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          actionExecuted: response.actionExecuted
        };

        setMessages(prev => [...prev, resultMessage]);
      } else {
        throw new Error(response.message || 'Failed to execute action');
      }
    } catch (err: any) {
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Failed to execute action';
      setError(errorMessage);

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Failed to execute action: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    confirmAction,
    clearMessages,
  };
}

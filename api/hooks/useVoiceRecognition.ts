import { useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useVoiceRecognition(
  onResult?: (transcript: string) => void,
  options?: {
    continuous?: boolean;
    language?: string;
    interimResults?: boolean;
  }
): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // Configuration
      recognition.continuous = options?.continuous ?? true;
      recognition.lang = options?.language ?? 'en-US';
      recognition.interimResults = options?.interimResults ?? true;
      recognition.maxAlternatives = 1;

      // Event handlers
      recognition.onstart = () => {
        console.log('[VOICE] Speech recognition started');
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        console.log('[VOICE] Speech recognition ended');
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;

          if (result.isFinal) {
            finalText += text + ' ';
          } else {
            interimText += text;
          }
        }

        // Update interim results
        if (interimText) {
          setInterimTranscript(interimText);
        }

        // Update final results
        if (finalText) {
          const newFinalTranscript = finalTranscriptRef.current + finalText;
          finalTranscriptRef.current = newFinalTranscript;
          setTranscript(newFinalTranscript.trim());
          setInterimTranscript('');

          // Call callback with final transcript
          if (onResult && !options?.continuous) {
            onResult(newFinalTranscript.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[VOICE] Speech recognition error:', event.error);
        
        let errorMessage = 'Voice recognition error';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not found or not accessible.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage = 'Network error occurred.';
            break;
          case 'aborted':
            // User intentionally stopped - don't show error
            errorMessage = '';
            break;
          default:
            errorMessage = `Voice recognition error: ${event.error}`;
        }

        if (errorMessage) {
          setError(errorMessage);
        }
        
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [options?.continuous, options?.language, options?.interimResults, onResult]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    try {
      // Reset transcripts
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      setError(null);

      recognitionRef.current.start();
    } catch (err: any) {
      console.error('[VOICE] Failed to start recognition:', err);
      if (err.message && err.message.includes('already started')) {
        // Already listening - stop and restart
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            setError('Failed to restart voice recognition');
          }
        }, 100);
      } else {
        setError('Failed to start voice recognition');
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        
        // Call callback with final transcript if in continuous mode
        if (onResult && options?.continuous && finalTranscriptRef.current) {
          onResult(finalTranscriptRef.current.trim());
        }
      } catch (err) {
        console.error('[VOICE] Failed to stop recognition:', err);
      }
    }
  }, [isListening, onResult, options?.continuous]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
}

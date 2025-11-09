/**
 * AquaMind Text-to-Speech Service
 * 
 * Provides text-to-speech conversion using browser-based synthesis
 * or cloud TTS APIs when available.
 */

export interface TTSConfig {
  enabled: boolean;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

class TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private config: TTSConfig = {
    enabled: true,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
      
      // Voices might not load immediately
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return;
    
    this.voices = this.synthesis.getVoices();
    
    // Prefer English voices
    const preferredVoice = this.voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
    );
    
    if (preferredVoice) {
      this.config.voice = preferredVoice.name;
    }
  }

  /**
   * Speak text using browser TTS
   */
  speak(text: string, options?: TTSOptions): Promise<void> {
    if (!this.synthesis || !this.config.enabled) {
      console.log('[TTS] TTS not available or disabled');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis!.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply configuration
      utterance.rate = options?.rate ?? this.config.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? this.config.pitch ?? 1.0;
      utterance.volume = options?.volume ?? this.config.volume ?? 0.8;

      // Set voice if specified
      const voiceName = options?.voice ?? this.config.voice;
      if (voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onend = () => {
        console.log('[TTS] Speech completed');
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('[TTS] Speech error:', event.error);
        reject(new Error(event.error));
      };

      this.synthesis!.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Check if TTS is currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[TTS] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): TTSConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable TTS
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return this.synthesis !== null;
  }
}

// Singleton instance
export const ttsService = new TTSService();

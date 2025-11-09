// Ambient audio atmosphere engine
// Web Audio API with smooth cross-fading

import { ThemeType, DayPeriod } from '../theme/themeEngine';
import { MoodTone } from './aiMoodEngine';

export type SoundscapeType = 'rain' | 'wind' | 'birds' | 'crickets' | 'silent' | 'gentle-wind';

export interface AudioSettings {
  masterVolume: number; // 0-1
  ambientVolume: number; // 0-1
  uiVolume: number; // 0-1
  muted: boolean;
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private ambientBuffers: Map<SoundscapeType, AudioBuffer> = new Map();
  private uiBuffers: Map<string, AudioBuffer> = new Map();
  
  private currentAmbientSource: AudioBufferSourceNode | null = null;
  private currentAmbientGain: GainNode | null = null;
  private currentSoundscape: SoundscapeType = 'silent';
  
  private settings: AudioSettings = {
    masterVolume: 0.5,
    ambientVolume: 0.6,
    uiVolume: 0.4,
    muted: false,
  };
  
  private crossfadeDuration = 2.0; // seconds
  private initialized = false;

  constructor() {
    this.loadSettings();
  }

  // Initialize Audio Context (must be called after user interaction)
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
      console.log('AudioEngine initialized');
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  // Load audio file into buffer
  private async loadAudioFile(path: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;
    
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load audio: ${path}`, error);
      return null;
    }
  }

  // Preload ambient soundscapes
  async preloadAmbient(): Promise<void> {
    if (!this.audioContext) await this.initialize();
    if (!this.audioContext) return;
    
    const soundscapes: [SoundscapeType, string][] = [
      ['rain', '/audio/ambient/rain-loop.mp3'],
      ['wind', '/audio/ambient/wind-loop.mp3'],
      ['birds', '/audio/ambient/birds-loop.mp3'],
      ['crickets', '/audio/ambient/crickets-loop.mp3'],
      ['gentle-wind', '/audio/ambient/gentle-wind-loop.mp3'],
    ];
    
    for (const [type, path] of soundscapes) {
      const buffer = await this.loadAudioFile(path);
      if (buffer) {
        this.ambientBuffers.set(type, buffer);
      }
    }
  }

  // Preload UI sounds
  async preloadUISounds(): Promise<void> {
    if (!this.audioContext) await this.initialize();
    if (!this.audioContext) return;
    
    const uiSounds: [string, string][] = [
      ['button-tap', '/audio/ui/button-tap.mp3'],
      ['ai-chime', '/audio/ui/ai-chime.mp3'],
      ['scene-whoosh', '/audio/ui/scene-whoosh.mp3'],
      ['notification', '/audio/ui/notification.mp3'],
    ];
    
    for (const [name, path] of uiSounds) {
      const buffer = await this.loadAudioFile(path);
      if (buffer) {
        this.uiBuffers.set(name, buffer);
      }
    }
  }

  // Determine soundscape from weather and time
  getSoundscapeForConditions(theme: ThemeType, dayPeriod: DayPeriod): SoundscapeType {
    if (theme === 'rain') return 'rain';
    if (theme === 'night' && dayPeriod !== 'midday') return 'crickets';
    if (theme === 'clear' && dayPeriod === 'morning') return 'birds';
    if (theme === 'cloudy' || theme === 'snow') return 'gentle-wind';
    return 'silent';
  }

  // Play ambient soundscape with cross-fade
  async playAmbient(soundscape: SoundscapeType): Promise<void> {
    if (!this.audioContext || this.settings.muted) return;
    if (soundscape === this.currentSoundscape) return;
    if (soundscape === 'silent') {
      this.stopAmbient();
      return;
    }
    
    const buffer = this.ambientBuffers.get(soundscape);
    if (!buffer) {
      console.warn(`Soundscape not loaded: ${soundscape}`);
      return;
    }
    
    // Create new source and gain nodes
    const newSource = this.audioContext.createBufferSource();
    const newGain = this.audioContext.createGain();
    
    newSource.buffer = buffer;
    newSource.loop = true;
    newSource.connect(newGain);
    newGain.connect(this.audioContext.destination);
    
    // Start at 0 volume
    newGain.gain.value = 0;
    newSource.start(0);
    
    const now = this.audioContext.currentTime;
    const targetVolume = this.settings.masterVolume * this.settings.ambientVolume;
    
    // Fade in new source
    newGain.gain.linearRampToValueAtTime(targetVolume, now + this.crossfadeDuration);
    
    // Fade out old source if exists
    if (this.currentAmbientSource && this.currentAmbientGain) {
      const oldSource = this.currentAmbientSource;
      const oldGain = this.currentAmbientGain;
      
      oldGain.gain.linearRampToValueAtTime(0, now + this.crossfadeDuration);
      
      // Stop and cleanup old source after fade
      setTimeout(() => {
        oldSource.stop();
        oldSource.disconnect();
        oldGain.disconnect();
      }, this.crossfadeDuration * 1000 + 100);
    }
    
    this.currentAmbientSource = newSource;
    this.currentAmbientGain = newGain;
    this.currentSoundscape = soundscape;
  }

  // Stop ambient soundscape
  stopAmbient(): void {
    if (!this.audioContext || !this.currentAmbientSource) return;
    
    const now = this.audioContext.currentTime;
    
    if (this.currentAmbientGain) {
      this.currentAmbientGain.gain.linearRampToValueAtTime(0, now + this.crossfadeDuration);
    }
    
    setTimeout(() => {
      if (this.currentAmbientSource) {
        this.currentAmbientSource.stop();
        this.currentAmbientSource.disconnect();
      }
      if (this.currentAmbientGain) {
        this.currentAmbientGain.disconnect();
      }
      this.currentAmbientSource = null;
      this.currentAmbientGain = null;
    }, this.crossfadeDuration * 1000 + 100);
    
    this.currentSoundscape = 'silent';
  }

  // Play UI feedback sound
  playUISound(soundName: string): void {
    if (!this.audioContext || this.settings.muted) return;
    
    const buffer = this.uiBuffers.get(soundName);
    if (!buffer) return;
    
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    
    gain.gain.value = this.settings.masterVolume * this.settings.uiVolume;
    
    source.start(0);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  // Play synesthetic tone (for connection and mood events)
  private activeTones: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  async playTone(name: string, loop: boolean = false): Promise<void> {
    if (!this.audioContext || this.settings.muted) return;
    
    // If tone is already playing, don't restart
    if (this.activeTones.has(name)) return;
    
    // Load tone if not in UI buffers
    if (!this.uiBuffers.has(name)) {
      const buffer = await this.loadAudioFile(`/audio/sfx/${name}`);
      if (buffer) {
        this.uiBuffers.set(name, buffer);
      } else {
        return;
      }
    }
    
    const buffer = this.uiBuffers.get(name);
    if (!buffer) return;
    
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    
    // Start at low volume and fade in
    gain.gain.value = 0;
    const targetVolume = this.settings.masterVolume * this.settings.uiVolume * 0.7;
    const now = this.audioContext.currentTime;
    gain.gain.linearRampToValueAtTime(targetVolume, now + 0.3);
    
    source.start(0);
    
    this.activeTones.set(name, { source, gain });
    
    if (!loop) {
      source.onended = () => {
        this.activeTones.delete(name);
        source.disconnect();
        gain.disconnect();
      };
    }
  }

  stopTone(name: string): void {
    const tone = this.activeTones.get(name);
    if (!tone || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Fade out
    tone.gain.gain.linearRampToValueAtTime(0, now + 0.3);
    
    setTimeout(() => {
      tone.source.stop();
      tone.source.disconnect();
      tone.gain.disconnect();
      this.activeTones.delete(name);
    }, 300);
  }

  // Apply mood to ambient audio (adjust volume/pitch)
  applyMood(moodTone: MoodTone, energy: number): void {
    if (!this.currentAmbientGain || !this.audioContext) return;
    
    // Adjust volume based on energy
    const baseVolume = this.settings.masterVolume * this.settings.ambientVolume;
    const energyMultiplier = 0.7 + (energy * 0.3); // 0.7 to 1.0
    const targetVolume = baseVolume * energyMultiplier;
    
    const now = this.audioContext.currentTime;
    this.currentAmbientGain.gain.linearRampToValueAtTime(targetVolume, now + 1.0);
  }

  // Set master volume
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.updateCurrentVolume();
  }

  // Set ambient volume
  setAmbientVolume(volume: number): void {
    this.settings.ambientVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.updateCurrentVolume();
  }

  // Set UI volume
  setUIVolume(volume: number): void {
    this.settings.uiVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  // Toggle mute
  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.saveSettings();
    
    if (this.settings.muted) {
      this.stopAmbient();
    }
    
    return this.settings.muted;
  }

  // Get current settings
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  // Update volume of currently playing ambient
  private updateCurrentVolume(): void {
    if (!this.currentAmbientGain || !this.audioContext) return;
    
    const targetVolume = this.settings.masterVolume * this.settings.ambientVolume;
    const now = this.audioContext.currentTime;
    this.currentAmbientGain.gain.linearRampToValueAtTime(targetVolume, now + 0.5);
  }

  // Save settings to localStorage
  private saveSettings(): void {
    localStorage.setItem('audioSettings', JSON.stringify(this.settings));
  }

  // Load settings from localStorage
  private loadSettings(): void {
    const saved = localStorage.getItem('audioSettings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load audio settings:', error);
      }
    }
  }

  // Cleanup
  destroy(): void {
    this.stopAmbient();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();

// React hook for audio control
import { useState, useEffect } from 'react';

export const useAudioEngine = () => {
  const [settings, setSettings] = useState<AudioSettings>(audioEngine.getSettings());
  const [currentSoundscape, setCurrentSoundscape] = useState<SoundscapeType>('silent');
  
  useEffect(() => {
    // Initialize on mount
    audioEngine.initialize();
    audioEngine.preloadAmbient();
    audioEngine.preloadUISounds();
  }, []);
  
  const updateSettings = () => {
    setSettings(audioEngine.getSettings());
  };
  
  const setVolume = (volume: number) => {
    audioEngine.setMasterVolume(volume);
    updateSettings();
  };
  
  const toggleMute = () => {
    audioEngine.toggleMute();
    updateSettings();
  };
  
  const playSound = (soundName: string) => {
    audioEngine.playUISound(soundName);
  };
  
  return {
    settings,
    currentSoundscape,
    setVolume,
    toggleMute,
    playSound,
  };
};

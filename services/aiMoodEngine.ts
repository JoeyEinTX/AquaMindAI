import { EventEmitter } from 'events';

export type MoodTone = 'neutral' | 'positive' | 'alert' | 'processing';
export type MoodFocus = 'idle' | 'engaged' | 'active';

export interface AIMood {
  energy: number; // 0-1, calm to active
  tone: MoodTone;
  focus: MoodFocus;
  timestamp: number;
}

export interface MoodColors {
  accentColor: string;
  glowColor: string;
  shadowTint: string;
  intensity: number;
}

class AIMoodEngine extends EventEmitter {
  private currentMood: AIMood = {
    energy: 0.3,
    tone: 'neutral',
    focus: 'idle',
    timestamp: Date.now(),
  };

  private activityHistory: { type: string; timestamp: number }[] = [];
  private decayInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startDecay();
  }

  // Get current mood state
  getMood(): AIMood {
    return { ...this.currentMood };
  }

  // Track AI typing event
  onAITyping() {
    this.updateMood({
      energy: Math.min(this.currentMood.energy + 0.2, 0.7),
      tone: 'processing',
      focus: 'engaged',
    });
    this.recordActivity('typing');
  }

  // Track AI response received
  onAIResponse(sentiment?: 'positive' | 'negative' | 'neutral') {
    const tone = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'alert' : 'neutral';
    
    this.updateMood({
      energy: 0.6,
      tone,
      focus: 'engaged',
    });
    this.recordActivity('response');
  }

  // Track AI action executed
  onAIAction(type: 'command' | 'adjustment' | 'advisory') {
    const energyBoost = type === 'command' ? 0.3 : type === 'adjustment' ? 0.2 : 0.1;
    
    this.updateMood({
      energy: Math.min(this.currentMood.energy + energyBoost, 1.0),
      tone: type === 'advisory' ? 'alert' : 'positive',
      focus: 'active',
    });
    this.recordActivity(`action:${type}`);
  }

  // Track system health impact
  onSystemHealth(cpuPercent: number, tempC?: number) {
    // High CPU or temp creates alert tone
    if (cpuPercent > 80 || (tempC && tempC > 70)) {
      this.updateMood({
        energy: Math.min(this.currentMood.energy + 0.1, 0.9),
        tone: 'alert',
        focus: this.currentMood.focus,
      });
    }
  }

  // Track weather-based mood influence
  onWeatherContext(condition: string) {
    // Weather subtly influences base energy
    const weatherEnergy = {
      'clear': 0.5,
      'cloudy': 0.3,
      'rain': 0.2,
      'snow': 0.2,
      'night': 0.1,
    };
    
    const baseEnergy = weatherEnergy[condition as keyof typeof weatherEnergy] || 0.3;
    
    // Only adjust if currently below this baseline
    if (this.currentMood.energy < baseEnergy) {
      this.updateMood({
        energy: baseEnergy,
        tone: this.currentMood.tone,
        focus: this.currentMood.focus,
      });
    }
  }

  // Reset to idle state
  reset() {
    this.updateMood({
      energy: 0.2,
      tone: 'neutral',
      focus: 'idle',
    });
  }

  // Get mood-appropriate colors
  getMoodColors(): MoodColors {
    const { tone, energy } = this.currentMood;
    
    let accentColor: string;
    let glowColor: string;
    let shadowTint: string;
    
    switch (tone) {
      case 'positive':
        accentColor = '#10b981'; // green
        glowColor = 'rgba(16, 185, 129, 0.4)';
        shadowTint = 'rgba(16, 185, 129, 0.1)';
        break;
      
      case 'alert':
        accentColor = '#f59e0b'; // amber
        glowColor = 'rgba(245, 158, 11, 0.5)';
        shadowTint = 'rgba(245, 158, 11, 0.15)';
        break;
      
      case 'processing':
        accentColor = '#8b5cf6'; // violet
        glowColor = 'rgba(139, 92, 246, 0.4)';
        shadowTint = 'rgba(139, 92, 246, 0.12)';
        break;
      
      case 'neutral':
      default:
        accentColor = '#06b6d4'; // cyan
        glowColor = 'rgba(6, 182, 212, 0.3)';
        shadowTint = 'rgba(6, 182, 212, 0.08)';
    }
    
    // Intensity scales with energy
    const intensity = Math.max(0.3, Math.min(1.0, energy));
    
    return {
      accentColor,
      glowColor,
      shadowTint,
      intensity,
    };
  }

  // Internal: Update mood and emit event
  private updateMood(partial: Partial<Omit<AIMood, 'timestamp'>>) {
    this.currentMood = {
      ...this.currentMood,
      ...partial,
      timestamp: Date.now(),
    };
    
    this.emit('mood-change', this.currentMood);
  }

  // Internal: Record activity for decay calculation
  private recordActivity(type: string) {
    this.activityHistory.push({
      type,
      timestamp: Date.now(),
    });
    
    // Keep only last 10 activities
    if (this.activityHistory.length > 10) {
      this.activityHistory.shift();
    }
  }

  // Internal: Decay mood over time (back to idle)
  private startDecay() {
    this.decayInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceUpdate = now - this.currentMood.timestamp;
      
      // After 30s of no activity, start decaying
      if (timeSinceUpdate > 30000) {
        const decayAmount = 0.05;
        const newEnergy = Math.max(0.1, this.currentMood.energy - decayAmount);
        
        // If energy is low and no recent activity, return to idle
        if (newEnergy < 0.3 && this.activityHistory.length === 0) {
          this.updateMood({
            energy: 0.2,
            tone: 'neutral',
            focus: 'idle',
          });
        } else if (newEnergy !== this.currentMood.energy) {
          this.updateMood({
            energy: newEnergy,
          });
        }
      }
      
      // Clean old activity history (> 2 minutes)
      this.activityHistory = this.activityHistory.filter(
        a => now - a.timestamp < 120000
      );
    }, 5000); // Check every 5s
  }

  // Clean up
  destroy() {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const aiMoodEngine = new AIMoodEngine();

// React hook for components
import { useState, useEffect } from 'react';

export const useAIMood = (): AIMood => {
  const [mood, setMood] = useState<AIMood>(aiMoodEngine.getMood());
  
  useEffect(() => {
    const handleMoodChange = (newMood: AIMood) => {
      setMood(newMood);
    };
    
    aiMoodEngine.on('mood-change', handleMoodChange);
    
    return () => {
      aiMoodEngine.off('mood-change', handleMoodChange);
    };
  }, []);
  
  return mood;
};

export const useAIMoodColors = (): MoodColors => {
  const mood = useAIMood();
  return aiMoodEngine.getMoodColors();
};

/**
 * AquaMind AI Memory Engine
 * 
 * Stores and manages conversational facts, user preferences, and learned behaviors
 * to improve AI recommendations and recall past interactions.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Memory entry types
export type MemoryType = 'preference' | 'feedback' | 'observation';

// Memory entry structure
export interface MemoryEntry {
  id: string;
  timestamp: string;
  source: string; // e.g., 'chat', 'zone_control', 'schedule'
  content: string;
  type: MemoryType;
  weight: number; // 0-1, higher = more important
  metadata?: Record<string, any>; // Additional context (zoneId, action, etc.)
}

// Learning statistics
export interface LearningStats {
  totalMemories: number;
  preferenceCount: number;
  feedbackCount: number;
  observationCount: number;
  lastUpdated: string;
  learningEnabled: boolean;
}

// User behavior pattern
export interface BehaviorPattern {
  pattern: string; // e.g., "prefers_short_durations"
  confidence: number; // 0-1
  evidence: string[]; // Memory IDs supporting this pattern
  lastReinforced: string;
}

class MemoryEngine {
  private memoryFile = join(process.cwd(), 'ai-memory.json');
  private enabled: boolean;
  
  // In-memory storage (current session)
  private shortTermMemory: Map<string, MemoryEntry> = new Map();
  
  // Long-term storage (persistent)
  private longTermMemory: MemoryEntry[] = [];
  
  // Learned behavior patterns
  private patterns: Map<string, BehaviorPattern> = new Map();
  
  private maxShortTermEntries = 50; // Limit short-term memory
  private maxLongTermEntries = 500; // Limit long-term memory
  
  constructor() {
    // Check if learning is enabled via environment variable
    this.enabled = process.env.LEARNING_ENABLED !== 'false';
    
    if (this.enabled) {
      this.loadLongTermMemory();
      this.analyzeBehaviorPatterns();
      console.log('[AI][MEMORY] Memory engine initialized - learning ENABLED');
    } else {
      console.log('[AI][MEMORY] Memory engine initialized - learning DISABLED');
    }
  }

  /**
   * Load persistent memory from disk
   */
  private loadLongTermMemory(): void {
    try {
      if (existsSync(this.memoryFile)) {
        const data = readFileSync(this.memoryFile, 'utf-8');
        const stored = JSON.parse(data);
        this.longTermMemory = stored.memories || [];
        this.patterns = new Map(Object.entries(stored.patterns || {}));
        console.log(`[AI][MEMORY] Loaded ${this.longTermMemory.length} memories and ${this.patterns.size} patterns from disk`);
      } else {
        this.saveLongTermMemory();
        console.log('[AI][MEMORY] Initialized new memory file');
      }
    } catch (error) {
      console.error('[AI][MEMORY] Failed to load memory file:', error);
      this.longTermMemory = [];
    }
  }

  /**
   * Save persistent memory to disk
   */
  private saveLongTermMemory(): void {
    if (!this.enabled) return;
    
    try {
      const data = {
        memories: this.longTermMemory,
        patterns: Object.fromEntries(this.patterns),
        lastUpdated: new Date().toISOString()
      };
      writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[AI][MEMORY] Failed to save memory file:', error);
    }
  }

  /**
   * Add a new memory entry
   */
  addMemory(
    source: string,
    content: string,
    type: MemoryType,
    weight: number = 0.5,
    metadata?: Record<string, any>
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      source,
      content,
      type,
      weight: Math.max(0, Math.min(1, weight)), // Clamp to 0-1
      metadata
    };

    // Add to short-term memory
    this.shortTermMemory.set(entry.id, entry);
    
    // Rotate short-term memory if needed
    if (this.shortTermMemory.size > this.maxShortTermEntries) {
      const oldestKey = this.shortTermMemory.keys().next().value;
      this.shortTermMemory.delete(oldestKey);
    }

    // Add to long-term memory if learning is enabled
    if (this.enabled) {
      this.longTermMemory.unshift(entry); // Most recent first
      
      // Rotate long-term memory
      if (this.longTermMemory.length > this.maxLongTermEntries) {
        this.longTermMemory = this.longTermMemory.slice(0, this.maxLongTermEntries);
      }
      
      this.saveLongTermMemory();
    }

    console.log(`[AI][MEMORY] Added ${type} memory: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`);
    
    return entry;
  }

  /**
   * Record user feedback on an AI action or advisory
   */
  recordFeedback(
    action: string,
    followed: boolean,
    context?: Record<string, any>
  ): void {
    const content = followed 
      ? `User followed AI recommendation: ${action}`
      : `User rejected/ignored AI recommendation: ${action}`;
    
    const weight = followed ? 0.7 : 0.3; // Higher weight for followed actions
    
    this.addMemory('feedback', content, 'feedback', weight, {
      action,
      followed,
      ...context
    });

    // Update behavior patterns based on feedback
    this.updatePatternsFromFeedback(action, followed, context);
  }

  /**
   * Update behavior patterns based on feedback
   */
  private updatePatternsFromFeedback(
    action: string,
    followed: boolean,
    context?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    // Analyze action to identify patterns
    if (action.includes('shorter duration') || action.includes('reduce duration')) {
      this.reinforcePattern(
        'prefers_short_durations',
        followed,
        `User tendency to prefer shorter watering durations`
      );
    }
    
    if (action.includes('Zone 3') && context?.zoneId === 3) {
      this.reinforcePattern(
        'zone_3_short_runs',
        followed && action.includes('short'),
        `Zone 3 typically runs with shorter durations`
      );
    }

    if (action.includes('skip') && action.includes('rain')) {
      this.reinforcePattern(
        'rain_aware',
        followed,
        `User follows rain-based watering recommendations`
      );
    }

    if (action.includes('morning') && context?.timeOfDay === 'morning') {
      this.reinforcePattern(
        'morning_watering_preference',
        followed,
        `User prefers morning watering schedules`
      );
    }
  }

  /**
   * Reinforce or weaken a behavior pattern
   */
  private reinforcePattern(
    patternId: string,
    reinforce: boolean,
    description: string
  ): void {
    let pattern = this.patterns.get(patternId);
    
    if (!pattern) {
      pattern = {
        pattern: description,
        confidence: 0.5,
        evidence: [],
        lastReinforced: new Date().toISOString()
      };
      this.patterns.set(patternId, pattern);
    }

    // Adjust confidence based on reinforcement
    const delta = reinforce ? 0.1 : -0.15; // Punish ignoring more than reward following
    pattern.confidence = Math.max(0, Math.min(1, pattern.confidence + delta));
    pattern.lastReinforced = new Date().toISOString();

    console.log(`[AI][MEMORY] Pattern "${patternId}" ${reinforce ? 'reinforced' : 'weakened'} to ${(pattern.confidence * 100).toFixed(1)}% confidence`);
    
    this.saveLongTermMemory();
  }

  /**
   * Analyze memories to identify behavior patterns
   */
  private analyzeBehaviorPatterns(): void {
    if (!this.enabled || this.longTermMemory.length < 10) return;

    // Analyze zone preferences
    const zoneUsage = new Map<number, { count: number; avgDuration: number }>();
    const zoneCancellations = new Map<number, number>();

    this.longTermMemory.forEach(mem => {
      if (mem.metadata?.zoneId) {
        const zoneId = mem.metadata.zoneId;
        
        if (mem.content.includes('started') || mem.content.includes('ran')) {
          const current = zoneUsage.get(zoneId) || { count: 0, avgDuration: 0 };
          current.count++;
          if (mem.metadata.durationSec) {
            current.avgDuration = (current.avgDuration * (current.count - 1) + mem.metadata.durationSec) / current.count;
          }
          zoneUsage.set(zoneId, current);
        }
        
        if (mem.content.includes('cancelled') || mem.content.includes('stopped early')) {
          zoneCancellations.set(zoneId, (zoneCancellations.get(zoneId) || 0) + 1);
        }
      }
    });

    // Identify zones with frequent cancellations
    zoneCancellations.forEach((cancelCount, zoneId) => {
      const usage = zoneUsage.get(zoneId);
      if (usage && cancelCount / usage.count > 0.3) { // 30% cancellation rate
        this.reinforcePattern(
          `zone_${zoneId}_often_cancelled`,
          true,
          `Zone ${zoneId} is frequently cancelled or stopped early`
        );
      }
    });
  }

  /**
   * Get relevant memories for context injection
   */
  getRelevantMemories(limit: number = 10, filters?: {
    type?: MemoryType;
    source?: string;
    minWeight?: number;
  }): MemoryEntry[] {
    // Combine short-term and long-term memories
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...this.longTermMemory
    ];

    // Apply filters
    let filtered = allMemories;
    
    if (filters?.type) {
      filtered = filtered.filter(m => m.type === filters.type);
    }
    
    if (filters?.source) {
      filtered = filtered.filter(m => m.source === filters.source);
    }
    
    if (filters?.minWeight !== undefined) {
      filtered = filtered.filter(m => m.weight >= filters.minWeight);
    }

    // Sort by timestamp (most recent first) and weight
    filtered.sort((a, b) => {
      const timeScore = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      const weightScore = (b.weight - a.weight) * 1000000; // Weight difference scaled up
      return weightScore + timeScore;
    });

    return filtered.slice(0, limit);
  }

  /**
   * Get learned behavior patterns
   */
  getPatterns(minConfidence: number = 0.6): BehaviorPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get statistics about learning
   */
  getStats(): LearningStats {
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...this.longTermMemory
    ];

    return {
      totalMemories: allMemories.length,
      preferenceCount: allMemories.filter(m => m.type === 'preference').length,
      feedbackCount: allMemories.filter(m => m.type === 'feedback').length,
      observationCount: allMemories.filter(m => m.type === 'observation').length,
      lastUpdated: new Date().toISOString(),
      learningEnabled: this.enabled
    };
  }

  /**
   * Clear short-term (session) memory
   */
  clearShortTermMemory(): void {
    const previousSize = this.shortTermMemory.size;
    this.shortTermMemory.clear();
    console.log(`[AI][MEMORY] Cleared ${previousSize} short-term memories`);
  }

  /**
   * Clear all memory (short-term and long-term)
   */
  clearAllMemory(): void {
    const previousTotal = this.shortTermMemory.size + this.longTermMemory.length;
    this.shortTermMemory.clear();
    this.longTermMemory = [];
    this.patterns.clear();
    
    if (this.enabled) {
      this.saveLongTermMemory();
    }
    
    console.log(`[AI][MEMORY] Cleared all ${previousTotal} memories and patterns`);
  }

  /**
   * Get all memories (for debugging/inspection)
   */
  getAllMemories(): MemoryEntry[] {
    return [
      ...Array.from(this.shortTermMemory.values()),
      ...this.longTermMemory
    ];
  }

  /**
   * Format memories as context string for AI
   */
  formatMemoriesForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) return '';

    const sections: string[] = [];

    // Group by type
    const byType = {
      preference: memories.filter(m => m.type === 'preference'),
      feedback: memories.filter(m => m.type === 'feedback'),
      observation: memories.filter(m => m.type === 'observation')
    };

    if (byType.preference.length > 0) {
      sections.push('**User Preferences & Habits:**');
      byType.preference.slice(0, 5).forEach(m => {
        sections.push(`- ${m.content}`);
      });
    }

    if (byType.feedback.length > 0) {
      sections.push('\n**Recent Feedback & Responses:**');
      byType.feedback.slice(0, 5).forEach(m => {
        sections.push(`- ${m.content}`);
      });
    }

    if (byType.observation.length > 0) {
      sections.push('\n**Notable Observations:**');
      byType.observation.slice(0, 5).forEach(m => {
        sections.push(`- ${m.content}`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Format learned patterns as context string
   */
  formatPatternsForContext(patterns: BehaviorPattern[]): string {
    if (patterns.length === 0) return '';

    const lines = ['**Learned Behavior Patterns:**'];
    
    patterns.slice(0, 5).forEach(p => {
      const confidence = (p.confidence * 100).toFixed(0);
      lines.push(`- ${p.pattern} (${confidence}% confidence)`);
    });

    return lines.join('\n');
  }

  /**
   * Check if learning is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable learning
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[AI][MEMORY] Learning ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (!enabled) {
      // When disabling, save current state one last time
      this.saveLongTermMemory();
    }
  }
}

// Singleton instance
export const memoryEngine = new MemoryEngine();

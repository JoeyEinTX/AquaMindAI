/**
 * Intent Parser for AquaMind AI Assistant
 * Classifies natural language commands into actionable intents
 */

export type IntentType = 
  | 'startZone'
  | 'stopZone'
  | 'setRainDelay'
  | 'clearRainDelay'
  | 'createSchedule'
  | 'getStatus'
  | 'unknown';

export interface ParsedIntent {
  intent: IntentType;
  parameters: Record<string, any>;
  confidence: number;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

interface IntentPattern {
  pattern: RegExp;
  intent: IntentType;
  extractor: (match: RegExpMatchArray, fullText: string) => Record<string, any>;
  requiresConfirmation: (params: Record<string, any>) => boolean;
}

// Pattern definitions for intent recognition
const intentPatterns: IntentPattern[] = [
  // Start Zone patterns
  {
    pattern: /(?:start|run|turn on|activate|water)\s+(?:zone\s+)?(\d+)(?:\s+(?:for|duration)?\s+(\d+)\s*(min|mins|minute|minutes|sec|secs|second|seconds)?)?/i,
    intent: 'startZone',
    extractor: (match) => {
      const zoneId = parseInt(match[1]);
      const duration = match[2] ? parseInt(match[2]) : 10;
      const unit = match[3] || 'minutes';
      
      // Convert to seconds
      let durationSec = duration;
      if (unit.startsWith('min')) {
        durationSec = duration * 60;
      }
      
      return { zoneId, durationSec };
    },
    requiresConfirmation: (params) => params.durationSec > 600 // > 10 minutes
  },
  
  // Stop Zone patterns
  {
    pattern: /(?:stop|turn off|deactivate|halt|cancel)\s+(?:zone\s+)?(\d+)/i,
    intent: 'stopZone',
    extractor: (match) => ({
      zoneId: parseInt(match[1])
    }),
    requiresConfirmation: () => false
  },
  
  // Stop all zones
  {
    pattern: /(?:stop|turn off|deactivate)\s+(?:all|everything|all zones)/i,
    intent: 'stopZone',
    extractor: () => ({
      zoneId: 'all'
    }),
    requiresConfirmation: () => true
  },
  
  // Set rain delay patterns
  {
    pattern: /(?:set|activate|enable|create)\s+(?:a\s+)?rain\s*delay(?:\s+(?:for|of))?\s+(\d+)\s*(?:hour|hours|hr|hrs)?/i,
    intent: 'setRainDelay',
    extractor: (match) => ({
      hours: parseInt(match[1])
    }),
    requiresConfirmation: () => false
  },
  
  // Alternative rain delay patterns
  {
    pattern: /(?:pause|suspend|delay)\s+(?:watering|irrigation|all zones)(?:\s+(?:for|of))?\s+(\d+)\s*(?:hour|hours|hr|hrs|day|days)?/i,
    intent: 'setRainDelay',
    extractor: (match, fullText) => {
      let hours = parseInt(match[1]);
      // Check if "day" or "days" is mentioned
      if (/day|days/i.test(fullText)) {
        hours = hours * 24;
      }
      return { hours };
    },
    requiresConfirmation: () => false
  },
  
  // Clear rain delay patterns
  {
    pattern: /(?:clear|remove|cancel|disable|deactivate|end)\s+(?:the\s+)?rain\s*delay/i,
    intent: 'clearRainDelay',
    extractor: () => ({}),
    requiresConfirmation: () => false
  },
  
  // Resume watering
  {
    pattern: /(?:resume|restart|continue)\s+(?:watering|irrigation)/i,
    intent: 'clearRainDelay',
    extractor: () => ({}),
    requiresConfirmation: () => false
  },
  
  // Create schedule patterns
  {
    pattern: /(?:create|add|set up|make)\s+(?:a\s+)?schedule.*zone\s+(\d+).*?(\d{1,2}):(\d{2})\s*(?:am|pm)?.*?(?:every\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend|day)/i,
    intent: 'createSchedule',
    extractor: (match, fullText) => {
      const zoneId = parseInt(match[1]);
      let hour = parseInt(match[2]);
      const minute = parseInt(match[3]);
      
      // Handle AM/PM
      if (/pm/i.test(fullText) && hour < 12) {
        hour += 12;
      } else if (/am/i.test(fullText) && hour === 12) {
        hour = 0;
      }
      
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Parse days of week
      const dayText = match[4].toLowerCase();
      let daysOfWeek: number[] = [];
      
      if (dayText === 'weekday') {
        daysOfWeek = [1, 2, 3, 4, 5]; // Monday-Friday
      } else if (dayText === 'weekend') {
        daysOfWeek = [0, 6]; // Sunday, Saturday
      } else if (dayText === 'day') {
        daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Every day
      } else {
        const dayMap: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6
        };
        daysOfWeek = [dayMap[dayText]];
      }
      
      // Extract duration (default 10 minutes)
      const durationMatch = fullText.match(/(?:for|duration)\s+(\d+)\s*(min|mins|minute|minutes)/i);
      let durationSec = 600; // default 10 minutes
      if (durationMatch) {
        durationSec = parseInt(durationMatch[1]) * 60;
      }
      
      return { zoneId, startTime, daysOfWeek, durationSec };
    },
    requiresConfirmation: () => true
  },
  
  // Get status patterns
  {
    pattern: /(?:what'?s|what is|show|tell me|check)\s+(?:the\s+)?(?:status|running|active|current)/i,
    intent: 'getStatus',
    extractor: () => ({}),
    requiresConfirmation: () => false
  },
  
  {
    pattern: /(?:is\s+)?(?:anything|any zone|any zones)\s+(?:running|active|on)/i,
    intent: 'getStatus',
    extractor: () => ({}),
    requiresConfirmation: () => false
  }
];

/**
 * Parse a natural language command into an actionable intent
 */
export function parseIntent(text: string): ParsedIntent {
  const normalizedText = text.trim().toLowerCase();
  
  // Try each pattern
  for (const pattern of intentPatterns) {
    const match = normalizedText.match(pattern.pattern);
    if (match) {
      const parameters = pattern.extractor(match, normalizedText);
      const requiresConfirmation = pattern.requiresConfirmation(parameters);
      
      // Generate confirmation message
      let confirmationMessage: string | undefined;
      if (requiresConfirmation) {
        confirmationMessage = generateConfirmationMessage(pattern.intent, parameters);
      }
      
      return {
        intent: pattern.intent,
        parameters,
        confidence: 0.9, // High confidence for matched patterns
        requiresConfirmation,
        confirmationMessage
      };
    }
  }
  
  // No pattern matched
  return {
    intent: 'unknown',
    parameters: {},
    confidence: 0,
    requiresConfirmation: false
  };
}

/**
 * Generate a user-friendly confirmation message
 */
function generateConfirmationMessage(intent: IntentType, parameters: Record<string, any>): string {
  switch (intent) {
    case 'startZone':
      const minutes = Math.floor(parameters.durationSec / 60);
      return `Confirm: Start Zone ${parameters.zoneId} for ${minutes} minute${minutes !== 1 ? 's' : ''}?`;
    
    case 'stopZone':
      if (parameters.zoneId === 'all') {
        return `Confirm: Stop all active zones?`;
      }
      return `Confirm: Stop Zone ${parameters.zoneId}?`;
    
    case 'createSchedule':
      const days = parameters.daysOfWeek.map((d: number) => 
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
      ).join(', ');
      const schedMinutes = Math.floor(parameters.durationSec / 60);
      return `Confirm: Create schedule for Zone ${parameters.zoneId} at ${parameters.startTime} on ${days} for ${schedMinutes} minutes?`;
    
    default:
      return 'Confirm this action?';
  }
}

/**
 * Validate intent parameters before execution
 */
export function validateIntent(intent: ParsedIntent): { valid: boolean; error?: string } {
  switch (intent.intent) {
    case 'startZone':
      if (!intent.parameters.zoneId || intent.parameters.zoneId < 1 || intent.parameters.zoneId > 4) {
        return { valid: false, error: 'Invalid zone ID. Must be 1-4' };
      }
      if (!intent.parameters.durationSec || intent.parameters.durationSec < 1) {
        return { valid: false, error: 'Invalid duration. Must be at least 1 second' };
      }
      if (intent.parameters.durationSec > 3600) {
        return { valid: false, error: 'Duration too long. Maximum is 60 minutes' };
      }
      break;
    
    case 'stopZone':
      if (intent.parameters.zoneId !== 'all' && 
          (!intent.parameters.zoneId || intent.parameters.zoneId < 1 || intent.parameters.zoneId > 4)) {
        return { valid: false, error: 'Invalid zone ID. Must be 1-4' };
      }
      break;
    
    case 'setRainDelay':
      if (!intent.parameters.hours || intent.parameters.hours < 1 || intent.parameters.hours > 168) {
        return { valid: false, error: 'Invalid rain delay. Must be 1-168 hours (7 days)' };
      }
      break;
    
    case 'createSchedule':
      if (!intent.parameters.zoneId || intent.parameters.zoneId < 1 || intent.parameters.zoneId > 4) {
        return { valid: false, error: 'Invalid zone ID. Must be 1-4' };
      }
      if (!intent.parameters.startTime || !/^\d{2}:\d{2}$/.test(intent.parameters.startTime)) {
        return { valid: false, error: 'Invalid start time format' };
      }
      if (!Array.isArray(intent.parameters.daysOfWeek) || intent.parameters.daysOfWeek.length === 0) {
        return { valid: false, error: 'Must specify at least one day' };
      }
      if (!intent.parameters.durationSec || intent.parameters.durationSec < 1) {
        return { valid: false, error: 'Invalid duration' };
      }
      break;
  }
  
  return { valid: true };
}

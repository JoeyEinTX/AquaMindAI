/**
 * AquaMind Conversation Manager
 * 
 * Manages conversational continuity by tracking recent conversation turns
 * and providing context for follow-up questions.
 */

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: string;
}

class ConversationManager {
  private conversations: Map<string, ConversationTurn[]> = new Map();
  private maxTurnsPerSession = 5; // Keep last 5 turns
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create a session ID for a user
   * In a real app, this would be tied to user authentication
   */
  private getSessionId(userIdentifier?: string): string {
    // For now, use a default session
    // In production, this should be per-user
    return userIdentifier || 'default-session';
  }

  /**
   * Add a conversation turn to the session
   */
  addTurn(
    role: 'user' | 'assistant',
    content: string,
    intent?: string,
    sessionId?: string
  ): void {
    const session = this.getSessionId(sessionId);
    
    if (!this.conversations.has(session)) {
      this.conversations.set(session, []);
    }

    const turns = this.conversations.get(session)!;
    
    turns.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      intent
    });

    // Keep only last N turns
    if (turns.length > this.maxTurnsPerSession * 2) { // *2 because each exchange has 2 turns
      this.conversations.set(
        session,
        turns.slice(-this.maxTurnsPerSession * 2)
      );
    }

    this.cleanupOldSessions();
  }

  /**
   * Get recent conversation turns for context
   */
  getRecentTurns(count: number = 5, sessionId?: string): ConversationTurn[] {
    const session = this.getSessionId(sessionId);
    const turns = this.conversations.get(session) || [];
    
    // Return most recent N turns
    return turns.slice(-count * 2); // *2 to get both user and assistant
  }

  /**
   * Format conversation history for AI context
   */
  formatForContext(sessionId?: string): string {
    const turns = this.getRecentTurns(5, sessionId);
    
    if (turns.length === 0) {
      return '';
    }

    const lines = ['**Recent Conversation History:**'];
    
    turns.forEach(turn => {
      const prefix = turn.role === 'user' ? 'User' : 'Assistant';
      lines.push(`${prefix}: ${turn.content}`);
    });

    return lines.join('\n');
  }

  /**
   * Clear conversation history for a session
   */
  clearSession(sessionId?: string): void {
    const session = this.getSessionId(sessionId);
    this.conversations.delete(session);
    console.log(`[CONVERSATION] Cleared session: ${session}`);
  }

  /**
   * Clean up old sessions
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    
    for (const [sessionId, turns] of this.conversations.entries()) {
      if (turns.length > 0) {
        const lastTurn = turns[turns.length - 1];
        const lastTimestamp = new Date(lastTurn.timestamp).getTime();
        
        if (now - lastTimestamp > this.sessionTimeout) {
          this.conversations.delete(sessionId);
          console.log(`[CONVERSATION] Cleaned up expired session: ${sessionId}`);
        }
      }
    }
  }

  /**
   * Get statistics about conversations
   */
  getStats(): {
    activeSessions: number;
    totalTurns: number;
  } {
    let totalTurns = 0;
    
    for (const turns of this.conversations.values()) {
      totalTurns += turns.length;
    }

    return {
      activeSessions: this.conversations.size,
      totalTurns
    };
  }
}

// Singleton instance
export const conversationManager = new ConversationManager();

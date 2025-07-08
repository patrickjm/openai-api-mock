import Fuse from 'fuse.js';
import { MockResponse, ConversationMessage, ChatCompletionRequest } from './types';
import { Logger } from './logger';

export class MessageMatcherService {
  constructor(private logger: Logger) {}

  // Matcher specificity scores (higher = more specific)
  private readonly MATCHER_SCORES: Record<string, number> = {
    'exact': 1.0,
    'regex': 0.8,
    'contains': 0.6,
    'fuzzy': 0.4,
    'any': 0.1
  };

  findMatch(request: ChatCompletionRequest, responses: MockResponse[]): { response: MockResponse; matchedLength: number } | null {
    this.logger.debug('Finding match for request', {
      messageCount: request.messages.length,
      responseCount: responses.length,
    });

    let bestMatch: { response: MockResponse; matchedLength: number; score: number } | null = null;

    for (const response of responses) {
      const matchResult = this.isMatch(request.messages, response.messages);
      if (matchResult.isMatch) {
        this.logger.debug(`Found match with response: ${response.id}, matched ${matchResult.matchedLength} messages, score: ${matchResult.score}`);
        
        // Choose the match with the highest score (most specific)
        if (!bestMatch || matchResult.score > bestMatch.score) {
          bestMatch = { response, matchedLength: matchResult.matchedLength, score: matchResult.score };
        }
      }
    }

    if (bestMatch) {
      this.logger.debug(`Best match: ${bestMatch.response.id} with score ${bestMatch.score}`);
      return { response: bestMatch.response, matchedLength: bestMatch.matchedLength };
    }

    this.logger.debug('No match found');
    return null;
  }

  private isMatch(messages: ChatCompletionRequest['messages'], conversationFlow: ConversationMessage[]): { isMatch: boolean; matchedLength: number; score: number } {
    // Support partial matching: incoming messages should match the beginning of the conversation flow
    if (messages.length > conversationFlow.length) {
      return { isMatch: false, matchedLength: 0, score: 0 };
    }

    let matchedLength = 0;
    let totalScore = 0;
    let matchedMessages = 0;

    for (let i = 0; i < messages.length; i++) {
      const incomingMessage = messages[i];
      const flowMessage = conversationFlow[i];

      // Check role match first
      if (incomingMessage.role !== flowMessage.role) {
        return { isMatch: false, matchedLength: 0, score: 0 };
      }

      // For assistant messages, they don't need to match (they're the responses)
      if (flowMessage.role === 'assistant') {
        matchedLength++;
        continue;
      }

      // Apply per-message matching
      const matcher = flowMessage.matcher || 'exact';
      
      if (matcher === 'any') {
        // 'any' matcher accepts any message of the correct role
        matchedLength++;
        matchedMessages++;
        totalScore += this.MATCHER_SCORES[matcher];
        continue;
      }

      // All other matchers require content
      if (!incomingMessage.content || !flowMessage.content) {
        // Handle tool calls for tool messages
        if (flowMessage.role === 'tool' && incomingMessage.tool_call_id && flowMessage.tool_call_id) {
          if (incomingMessage.tool_call_id === flowMessage.tool_call_id) {
            matchedLength++;
            matchedMessages++;
            totalScore += this.MATCHER_SCORES['exact']; // Tool call matches are exact
            continue;
          }
        }
        return { isMatch: false, matchedLength: 0, score: 0 };
      }

      const messageMatches = this.matchSingleMessage(incomingMessage.content, flowMessage.content, matcher, flowMessage.threshold);
      
      if (!messageMatches) {
        return { isMatch: false, matchedLength: 0, score: 0 };
      }

      matchedLength++;
      matchedMessages++;
      totalScore += this.MATCHER_SCORES[matcher];
    }

    // Calculate average score for matched messages
    const averageScore = matchedMessages > 0 ? totalScore / matchedMessages : 0;

    return { isMatch: true, matchedLength, score: averageScore };
  }

  private matchSingleMessage(incomingContent: string, patternContent: string, matcher: string, threshold?: number): boolean {
    switch (matcher) {
      case 'exact':
        return incomingContent.trim() === patternContent.trim();
      
      case 'fuzzy':
        const fuse = new Fuse([patternContent], {
          includeScore: true,
          threshold: 0.6, // More lenient Fuse.js threshold
        });

        const result = fuse.search(incomingContent);
        
        if (result.length === 0) {
          return false;
        }
        
        const score = result[0].score || 0;
        const similarity = 1 - score; // Convert distance to similarity
        
        return similarity >= (threshold || 0.8);
      
      case 'regex':
        try {
          const regex = new RegExp(patternContent, 'i');
          return regex.test(incomingContent);
        } catch (error) {
          this.logger.warn(`Invalid regex pattern: ${patternContent}`, error);
          return false;
        }
      
      case 'contains':
        return incomingContent.toLowerCase().includes(patternContent.toLowerCase());
      
      default:
        return false;
    }
  }

  // Helper method to find the response for a partial match
  // For partial matching, we always return the final assistant response in the conversation flow
  findResponseForMatch(conversationFlow: ConversationMessage[], matchedLength: number): ConversationMessage | null {
    // Always return the last assistant message in the conversation flow for partial matching
    for (let i = conversationFlow.length - 1; i >= 0; i--) {
      if (conversationFlow[i].role === 'assistant') {
        return conversationFlow[i];
      }
    }
    
    return null;
  }
}
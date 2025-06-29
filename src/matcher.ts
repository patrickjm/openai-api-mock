import Fuse from 'fuse.js';
import { MessageMatcher, MessagePattern, ChatCompletionRequest } from './types';
import { Logger } from './logger';

export class MessageMatcherService {
  constructor(private logger: Logger) {}

  findMatch(request: ChatCompletionRequest, matchers: MessageMatcher[]): MessageMatcher | null {
    this.logger.debug('Finding match for request', {
      messageCount: request.messages.length,
      matcherCount: matchers.length,
    });

    for (const matcher of matchers) {
      if (this.isMatch(request.messages, matcher)) {
        this.logger.debug(`Found match with matcher type: ${matcher.type}`);
        return matcher;
      }
    }

    this.logger.debug('No match found');
    return null;
  }

  private isMatch(messages: ChatCompletionRequest['messages'], matcher: MessageMatcher): boolean {
    let result: boolean;
    
    switch (matcher.type) {
      case 'exact':
        result = this.exactMatch(messages, matcher.messages);
        break;
      case 'fuzzy':
        result = this.fuzzyMatch(messages, matcher.messages, matcher.threshold || 0.8);
        break;
      case 'regex':
        result = this.regexMatch(messages, matcher.messages);
        break;
      case 'contains':
        result = this.containsMatch(messages, matcher.messages);
        break;
      default:
        result = false;
    }
    
    // Apply invert logic if specified
    return matcher.invert ? !result : result;
  }

  private exactMatch(messages: ChatCompletionRequest['messages'], patterns: MessagePattern[]): boolean {
    if (messages.length !== patterns.length) {
      return false;
    }

    for (let i = 0; i < messages.length; i++) {
      if (
        messages[i].role !== patterns[i].role ||
        messages[i].content.trim() !== patterns[i].content.trim()
      ) {
        return false;
      }
    }

    return true;
  }

  private fuzzyMatch(
    messages: ChatCompletionRequest['messages'],
    patterns: MessagePattern[],
    threshold: number
  ): boolean {
    if (messages.length !== patterns.length) {
      return false;
    }

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== patterns[i].role) {
        return false;
      }

      const fuse = new Fuse([patterns[i].content], {
        includeScore: true,
        threshold: 0.6, // More lenient Fuse.js threshold
      });

      const result = fuse.search(messages[i].content);
      
      // Check if we have a result and if the score meets our threshold
      if (result.length === 0) {
        return false;
      }
      
      const score = result[0].score || 0;
      const similarity = 1 - score; // Convert distance to similarity
      
      if (similarity < threshold) {
        return false;
      }
    }

    return true;
  }

  private regexMatch(messages: ChatCompletionRequest['messages'], patterns: MessagePattern[]): boolean {
    if (messages.length !== patterns.length) {
      return false;
    }

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== patterns[i].role) {
        return false;
      }

      try {
        const regex = new RegExp(patterns[i].content, 'i');
        if (!regex.test(messages[i].content)) {
          return false;
        }
      } catch (error) {
        this.logger.warn(`Invalid regex pattern: ${patterns[i].content}`, error);
        return false;
      }
    }

    return true;
  }

  private containsMatch(messages: ChatCompletionRequest['messages'], patterns: MessagePattern[]): boolean {
    if (messages.length !== patterns.length) {
      return false;
    }

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== patterns[i].role) {
        return false;
      }

      const messageContent = messages[i].content.toLowerCase();
      const patternContent = patterns[i].content.toLowerCase();
      
      if (!messageContent.includes(patternContent)) {
        return false;
      }
    }

    return true;
  }
}
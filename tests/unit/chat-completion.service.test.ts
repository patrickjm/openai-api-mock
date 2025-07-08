import { ChatCompletionService } from '../../src/services/chat-completion.service';
import { RequestValidator } from '../../src/services/request-validator';
import { TokenCounter } from '../../src/services/token-counter';
import { ValidationError } from '../../src/middleware/error.middleware';
import { ILogger, IRequestValidator, ITokenCounter } from '../../src/interfaces';
import { ChatCompletionRequest, MockResponse } from '../../src/types';

// Mock the MessageMatcherService
jest.mock('../../src/matcher', () => ({
  MessageMatcherService: jest.fn().mockImplementation(() => ({
    findMatch: jest.fn(),
    findResponseForMatch: jest.fn(),
  })),
}));

import { MessageMatcherService } from '../../src/matcher';

describe('ChatCompletionService', () => {
  let service: ChatCompletionService;
  let mockLogger: ILogger;
  let mockValidator: IRequestValidator;
  let mockTokenCounter: ITokenCounter;
  let mockMatcher: jest.Mocked<MessageMatcherService>;
  let mockResponses: MockResponse[];

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockValidator = {
      validateChatCompletionRequest: jest.fn(),
      validateToolCalls: jest.fn(),
    };

    mockTokenCounter = {
      calculateTokens: jest.fn(),
    };

    mockResponses = [
      {
        id: 'test-response',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      },
    ];

    // Create the service which will create the matcher internally
    service = new ChatCompletionService(mockLogger, mockValidator, mockTokenCounter, mockResponses);

    // Get the mocked matcher instance
    mockMatcher = (service as any).matcher as jest.Mocked<MessageMatcherService>;
  });

  describe('handleChatCompletion', () => {
    const validRequest: ChatCompletionRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    it('should handle valid request successfully', async () => {
      const validatedRequest = { ...validRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };
      const assistantMessage = { role: 'assistant' as const, content: 'Hi there!' };
      const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(assistantMessage);
      mockTokenCounter.calculateTokens = jest.fn().mockReturnValue(usage);

      const result = await service.handleChatCompletion(validRequest);

      expect(result).toEqual({
        id: expect.stringMatching(/^chatcmpl-/),
        assistantMessage,
        matchedResponseId: 'test-response',
        model: 'gpt-4',
        usage,
      });
      expect(mockValidator.validateChatCompletionRequest).toHaveBeenCalledWith(validRequest);
      expect(mockMatcher.findMatch).toHaveBeenCalledWith(validatedRequest, mockResponses);
      expect(mockMatcher.findResponseForMatch).toHaveBeenCalledWith(mockResponses[0].messages, 1);
      expect(mockTokenCounter.calculateTokens).toHaveBeenCalledWith(validatedRequest, 'Hi there!');
      expect(mockLogger.info).toHaveBeenCalledWith('Matched request to response: test-response');
    });

    it('should handle streaming request without calculating tokens', async () => {
      const streamingRequest = { ...validRequest, stream: true };
      const validatedRequest = { ...streamingRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };
      const assistantMessage = { role: 'assistant' as const, content: 'Hi there!' };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(assistantMessage);

      const result = await service.handleChatCompletion(streamingRequest);

      expect(result.usage).toBeUndefined();
      expect(mockTokenCounter.calculateTokens).not.toHaveBeenCalled();
    });

    it('should validate tool calls if present', async () => {
      const validatedRequest = { ...validRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: { name: 'test', arguments: '{}' },
        },
      ];
      const assistantMessage = {
        role: 'assistant' as const,
        content: 'Using tool',
        tool_calls: toolCalls,
      };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(assistantMessage);
      mockTokenCounter.calculateTokens = jest
        .fn()
        .mockReturnValue({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });

      await service.handleChatCompletion(validRequest);

      expect(mockValidator.validateToolCalls).toHaveBeenCalledWith(toolCalls);
    });

    it('should throw validation error for invalid request', async () => {
      const validationError = new ValidationError('Invalid request');
      mockValidator.validateChatCompletionRequest = jest.fn().mockImplementation(() => {
        throw validationError;
      });

      await expect(service.handleChatCompletion(validRequest)).rejects.toThrow(validationError);
    });

    it('should throw validation error when no match found', async () => {
      const validatedRequest = { ...validRequest };
      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(null);

      await expect(service.handleChatCompletion(validRequest)).rejects.toThrow(
        new ValidationError('No matching response found for the provided messages')
      );
    });

    it('should throw error when no assistant response found', async () => {
      const validatedRequest = { ...validRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(null);

      await expect(service.handleChatCompletion(validRequest)).rejects.toThrow(
        new Error('No assistant response found in conversation flow')
      );
    });

    it('should handle empty response content', async () => {
      const validatedRequest = { ...validRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };
      const assistantMessage = { role: 'assistant' as const, content: '' };
      const usage = { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(assistantMessage);
      mockTokenCounter.calculateTokens = jest.fn().mockReturnValue(usage);

      const result = await service.handleChatCompletion(validRequest);

      expect(result.usage).toEqual(usage);
      expect(mockTokenCounter.calculateTokens).toHaveBeenCalledWith(validatedRequest, '');
    });

    it('should handle undefined response content', async () => {
      const validatedRequest = { ...validRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };
      const assistantMessage = { role: 'assistant' as const };
      const usage = { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(assistantMessage);
      mockTokenCounter.calculateTokens = jest.fn().mockReturnValue(usage);

      const result = await service.handleChatCompletion(validRequest);

      expect(result.usage).toEqual(usage);
      expect(mockTokenCounter.calculateTokens).toHaveBeenCalledWith(validatedRequest, '');
    });

    it('should generate unique IDs for each request', async () => {
      const validatedRequest = { ...validRequest };
      const matchResult = {
        response: mockResponses[0],
        matchedLength: 1,
      };
      const assistantMessage = { role: 'assistant' as const, content: 'Hi there!' };
      const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };

      mockValidator.validateChatCompletionRequest = jest.fn().mockReturnValue(validatedRequest);
      mockMatcher.findMatch.mockReturnValue(matchResult);
      mockMatcher.findResponseForMatch.mockReturnValue(assistantMessage);
      mockTokenCounter.calculateTokens = jest.fn().mockReturnValue(usage);

      const result1 = await service.handleChatCompletion(validRequest);
      const result2 = await service.handleChatCompletion(validRequest);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^chatcmpl-/);
      expect(result2.id).toMatch(/^chatcmpl-/);
    });
  });
});

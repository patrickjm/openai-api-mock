import { TokenCounter } from '../../src/services/token-counter';
import { ILogger } from '../../src/interfaces';
import { ChatCompletionRequest } from '../../src/types';

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    tokenCounter = new TokenCounter(mockLogger);
  });

  afterEach(() => {
    try {
      tokenCounter.dispose();
    } catch (e) {
      // Ignore disposal errors in tests
    }
  });

  describe('calculateTokens', () => {
    it('should calculate tokens for simple request', () => {
      const request: ChatCompletionRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      };
      const responseContent = 'I am doing well, thank you!';

      const usage = tokenCounter.calculateTokens(request, responseContent);

      expect(usage.prompt_tokens).toBeGreaterThan(0);
      expect(usage.completion_tokens).toBeGreaterThan(0);
      expect(usage.total_tokens).toBe(usage.prompt_tokens + usage.completion_tokens);
    });

    it('should calculate tokens for multi-turn conversation', () => {
      const request: ChatCompletionRequest = {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, how are you?' },
          { role: 'assistant', content: 'I am doing well, thank you!' },
          { role: 'user', content: 'What is the weather like?' },
        ],
      };
      const responseContent = 'I cannot check the weather, but I can help with other things.';

      const usage = tokenCounter.calculateTokens(request, responseContent);

      expect(usage.prompt_tokens).toBeGreaterThan(0);
      expect(usage.completion_tokens).toBeGreaterThan(0);
      expect(usage.total_tokens).toBe(usage.prompt_tokens + usage.completion_tokens);
    });

    it('should handle messages with tool calls', () => {
      const request: ChatCompletionRequest = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'What is the weather?' },
          {
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"location": "San Francisco"}',
                },
              },
            ],
          },
          { role: 'tool', content: 'Sunny, 75°F', tool_call_id: 'call_123' },
        ],
      };
      const responseContent = 'The weather in San Francisco is sunny and 75°F.';

      const usage = tokenCounter.calculateTokens(request, responseContent);

      expect(usage.prompt_tokens).toBeGreaterThan(0);
      expect(usage.completion_tokens).toBeGreaterThan(0);
      expect(usage.total_tokens).toBe(usage.prompt_tokens + usage.completion_tokens);
    });

    it('should handle empty response content', () => {
      const request: ChatCompletionRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const responseContent = '';

      const usage = tokenCounter.calculateTokens(request, responseContent);

      expect(usage.prompt_tokens).toBeGreaterThan(0);
      expect(usage.completion_tokens).toBe(0);
      expect(usage.total_tokens).toBe(usage.prompt_tokens);
    });

    it('should handle messages without content', () => {
      const request: ChatCompletionRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user' }],
      };
      const responseContent = 'Response';

      const usage = tokenCounter.calculateTokens(request, responseContent);

      expect(usage.prompt_tokens).toBeGreaterThan(0);
      expect(usage.completion_tokens).toBeGreaterThan(0);
      expect(usage.total_tokens).toBe(usage.prompt_tokens + usage.completion_tokens);
    });

    it('should return zero tokens on error', () => {
      const tokenCounterSpy = jest
        .spyOn(tokenCounter as any, 'countTokens')
        .mockImplementation(() => {
          throw new Error('Token counting failed');
        });

      const request: ChatCompletionRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };
      const responseContent = 'Response';

      const usage = tokenCounter.calculateTokens(request, responseContent);

      expect(usage.prompt_tokens).toBe(0);
      expect(usage.completion_tokens).toBe(0);
      expect(usage.total_tokens).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith('Error calculating tokens', expect.any(Error));

      tokenCounterSpy.mockRestore();
    });
  });

  describe('formatMessagesForTokenCount', () => {
    it('should format messages with all fields', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          content: 'Hi!',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'test', arguments: '{}' },
            },
          ],
        },
        { role: 'tool', content: 'Result', tool_call_id: 'call_123' },
      ];

      const formatted = (tokenCounter as any).formatMessagesForTokenCount(messages);

      expect(formatted).toContain('user: Hello');
      expect(formatted).toContain('assistant: Hi!');
      expect(formatted).toContain('[tool_calls:');
      expect(formatted).toContain('[tool_call_id: call_123]');
    });
  });

  describe('dispose', () => {
    it('should dispose of encoding resources', () => {
      // Just test that dispose can be called without throwing
      expect(() => tokenCounter.dispose()).not.toThrow();
    });
  });
});

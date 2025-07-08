import { RequestValidator } from '../../src/services/request-validator';
import { ValidationError } from '../../src/middleware/error.middleware';
import { ILogger } from '../../src/interfaces';

describe('RequestValidator', () => {
  let validator: RequestValidator;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    validator = new RequestValidator(mockLogger);
  });

  describe('validateChatCompletionRequest', () => {
    const validRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    it('should accept valid request', () => {
      const result = validator.validateChatCompletionRequest(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should reject null request', () => {
      expect(() => validator.validateChatCompletionRequest(null)).toThrow(
        new ValidationError('Request body must be an object')
      );
    });

    it('should reject non-object request', () => {
      expect(() => validator.validateChatCompletionRequest('string')).toThrow(
        new ValidationError('Request body must be an object')
      );
    });

    it('should reject missing messages', () => {
      expect(() => validator.validateChatCompletionRequest({ model: 'gpt-4' })).toThrow(
        new ValidationError('messages is required and must be a non-empty array', 'messages')
      );
    });

    it('should reject empty messages array', () => {
      expect(() =>
        validator.validateChatCompletionRequest({
          model: 'gpt-4',
          messages: [],
        })
      ).toThrow(
        new ValidationError('messages is required and must be a non-empty array', 'messages')
      );
    });

    it('should reject missing model', () => {
      expect(() =>
        validator.validateChatCompletionRequest({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).toThrow(new ValidationError('model is required and must be a string', 'model'));
    });

    it('should reject non-string model', () => {
      expect(() =>
        validator.validateChatCompletionRequest({
          model: 123,
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).toThrow(new ValidationError('model is required and must be a string', 'model'));
    });

    describe('temperature validation', () => {
      it('should accept valid temperature', () => {
        const request = { ...validRequest, temperature: 0.7 };
        const result = validator.validateChatCompletionRequest(request);
        expect(result.temperature).toBe(0.7);
      });

      it('should reject temperature below 0', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            temperature: -0.1,
          })
        ).toThrow(
          new ValidationError('temperature must be a number between 0 and 2', 'temperature')
        );
      });

      it('should reject temperature above 2', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            temperature: 2.1,
          })
        ).toThrow(
          new ValidationError('temperature must be a number between 0 and 2', 'temperature')
        );
      });

      it('should reject non-number temperature', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            temperature: 'hot',
          })
        ).toThrow(
          new ValidationError('temperature must be a number between 0 and 2', 'temperature')
        );
      });
    });

    describe('top_p validation', () => {
      it('should accept valid top_p', () => {
        const request = { ...validRequest, top_p: 0.8 };
        const result = validator.validateChatCompletionRequest(request);
        expect(result.top_p).toBe(0.8);
      });

      it('should reject top_p below 0', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            top_p: -0.1,
          })
        ).toThrow(new ValidationError('top_p must be a number between 0 and 1', 'top_p'));
      });

      it('should reject top_p above 1', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            top_p: 1.1,
          })
        ).toThrow(new ValidationError('top_p must be a number between 0 and 1', 'top_p'));
      });
    });

    describe('n validation', () => {
      it('should accept valid n', () => {
        const request = { ...validRequest, n: 2 };
        const result = validator.validateChatCompletionRequest(request);
        expect(result.n).toBe(2);
      });

      it('should reject n <= 0', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            n: 0,
          })
        ).toThrow(new ValidationError('n must be a positive integer', 'n'));
      });

      it('should reject non-integer n', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            n: 1.5,
          })
        ).toThrow(new ValidationError('n must be a positive integer', 'n'));
      });
    });

    describe('stop validation', () => {
      it('should accept string stop', () => {
        const request = { ...validRequest, stop: 'STOP' };
        const result = validator.validateChatCompletionRequest(request);
        expect(result.stop).toBe('STOP');
      });

      it('should accept array of strings stop', () => {
        const request = { ...validRequest, stop: ['STOP', 'END'] };
        const result = validator.validateChatCompletionRequest(request);
        expect(result.stop).toEqual(['STOP', 'END']);
      });

      it('should reject non-string array elements', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            stop: ['STOP', 123],
          })
        ).toThrow(new ValidationError('stop array must contain only strings', 'stop'));
      });

      it('should reject non-string non-array stop', () => {
        expect(() =>
          validator.validateChatCompletionRequest({
            ...validRequest,
            stop: 123,
          })
        ).toThrow(new ValidationError('stop must be a string or array of strings', 'stop'));
      });
    });
  });

  describe('message validation', () => {
    it('should reject invalid role', () => {
      expect(() =>
        validator.validateChatCompletionRequest({
          model: 'gpt-4',
          messages: [{ role: 'invalid_role', content: 'Hello' }],
        })
      ).toThrow(
        new ValidationError(
          'messages[0].role must be one of: system, user, assistant, tool',
          'messages[0].role'
        )
      );
    });

    it('should require tool_call_id for tool messages', () => {
      expect(() =>
        validator.validateChatCompletionRequest({
          model: 'gpt-4',
          messages: [{ role: 'tool', content: 'Response' }],
        })
      ).toThrow(
        new ValidationError(
          'messages[0].tool_call_id is required for tool messages',
          'messages[0].tool_call_id'
        )
      );
    });

    it('should accept tool message with tool_call_id', () => {
      const request = {
        model: 'gpt-4',
        messages: [{ role: 'tool', content: 'Response', tool_call_id: 'call_123' }],
      };
      const result = validator.validateChatCompletionRequest(request);
      expect(result.messages[0]).toEqual({
        role: 'tool',
        content: 'Response',
        tool_call_id: 'call_123',
      });
    });

    it('should require content or tool_calls for assistant messages', () => {
      expect(() =>
        validator.validateChatCompletionRequest({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }, { role: 'assistant' }],
        })
      ).toThrow(
        new ValidationError('messages[1] must have either content or tool_calls', 'messages[1]')
      );
    });

    it('should accept assistant message with content', () => {
      const request = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };
      const result = validator.validateChatCompletionRequest(request);
      expect(result.messages[1].content).toBe('Hi there!');
    });

    it('should accept assistant message with tool_calls', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: '{"location": "SF"}',
          },
        },
      ];
      const request = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', tool_calls: toolCalls },
        ],
      };
      const result = validator.validateChatCompletionRequest(request);
      expect(result.messages[1].tool_calls).toEqual(toolCalls);
    });
  });

  describe('validateToolCalls', () => {
    it('should accept valid tool calls', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: '{"location": "SF"}',
          },
        },
      ];
      expect(() => validator.validateToolCalls(toolCalls)).not.toThrow();
    });

    it('should reject tool call without id', () => {
      const toolCalls = [
        {
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: '{"location": "SF"}',
          },
        },
      ] as any;
      expect(() => validator.validateToolCalls(toolCalls)).toThrow(
        new ValidationError('tool_calls[0].id is required and must be a string', 'tool_calls[0].id')
      );
    });

    it('should reject tool call with invalid type', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'invalid',
          function: {
            name: 'get_weather',
            arguments: '{"location": "SF"}',
          },
        },
      ] as any;
      expect(() => validator.validateToolCalls(toolCalls)).toThrow(
        new ValidationError("tool_calls[0].type must be 'function'", 'tool_calls[0].type')
      );
    });

    it('should reject tool call with invalid function arguments', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function' as const,
          function: {
            name: 'get_weather',
            arguments: 'invalid json',
          },
        },
      ];
      expect(() => validator.validateToolCalls(toolCalls)).toThrow(
        new ValidationError(
          'tool_calls[0].function.arguments must be a valid JSON string',
          'tool_calls[0].function.arguments'
        )
      );
    });

    it('should handle undefined tool calls', () => {
      expect(() => validator.validateToolCalls(undefined)).not.toThrow();
    });
  });
});

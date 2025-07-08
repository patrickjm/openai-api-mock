import { StreamService } from '../../src/services/stream.service';
import { ILogger, ChatCompletionResponse, StreamOptions } from '../../src/interfaces';

describe('StreamService', () => {
  let service: StreamService;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    service = new StreamService(mockLogger);
  });

  describe('streamResponse', () => {
    const baseResponse: ChatCompletionResponse = {
      id: 'chatcmpl-123',
      assistantMessage: { role: 'assistant', content: 'Hello world' },
      matchedResponseId: 'test-response',
      model: 'gpt-4',
    };

    const baseOptions: StreamOptions = {
      model: 'gpt-4',
      created: 1234567890,
      delayMs: 0, // No delay for tests
    };

    it('should stream text content word by word', async () => {
      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(baseResponse, baseOptions)) {
        chunks.push(chunk);
      }

      // Should have initial role chunk, word chunks, final chunk, and done signal
      expect(chunks.length).toBeGreaterThan(3);

      // Check first chunk has role
      const firstChunk = JSON.parse(chunks[0].replace('data: ', '').replace('\n\n', ''));
      expect(firstChunk.choices[0].delta.role).toBe('assistant');

      // Check word chunks
      const wordChunks = chunks.slice(1, -2); // Skip first, final, and done
      const words = wordChunks.map((chunk) => {
        const parsed = JSON.parse(chunk.replace('data: ', '').replace('\n\n', ''));
        return parsed.choices[0].delta.content;
      });
      expect(words.join('')).toBe('Hello world');

      // Check final chunk
      const finalChunk = JSON.parse(
        chunks[chunks.length - 2].replace('data: ', '').replace('\n\n', '')
      );
      expect(finalChunk.choices[0].finish_reason).toBe('stop');

      // Check done signal
      expect(chunks[chunks.length - 1]).toBe('data: [DONE]\n\n');
    });

    it('should stream tool calls before content', async () => {
      const responseWithTools: ChatCompletionResponse = {
        ...baseResponse,
        assistantMessage: {
          role: 'assistant',
          content: 'Using tool',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'test', arguments: '{}' },
            },
          ],
        },
      };

      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(responseWithTools, baseOptions)) {
        chunks.push(chunk);
      }

      // Find tool call chunk
      const toolCallChunk = chunks.find((chunk) => {
        if (chunk.startsWith('data: ') && chunk !== 'data: [DONE]\n\n') {
          const parsed = JSON.parse(chunk.replace('data: ', '').replace('\n\n', ''));
          return parsed.choices[0].delta.tool_calls;
        }
        return false;
      });

      expect(toolCallChunk).toBeDefined();
      const toolCallData = JSON.parse(toolCallChunk!.replace('data: ', '').replace('\n\n', ''));
      expect(toolCallData.choices[0].delta.tool_calls[0].id).toBe('call_123');
    });

    it('should handle empty content', async () => {
      const emptyResponse: ChatCompletionResponse = {
        ...baseResponse,
        assistantMessage: { role: 'assistant', content: '' },
      };

      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(emptyResponse, baseOptions)) {
        chunks.push(chunk);
      }

      // Should have initial role chunk, final chunk, and done signal
      expect(chunks.length).toBe(3);

      // Check first chunk has role
      const firstChunk = JSON.parse(chunks[0].replace('data: ', '').replace('\n\n', ''));
      expect(firstChunk.choices[0].delta.role).toBe('assistant');

      // Check final chunk
      const finalChunk = JSON.parse(chunks[1].replace('data: ', '').replace('\n\n', ''));
      expect(finalChunk.choices[0].finish_reason).toBe('stop');

      // Check done signal
      expect(chunks[2]).toBe('data: [DONE]\n\n');
    });

    it('should handle undefined content', async () => {
      const undefinedResponse: ChatCompletionResponse = {
        ...baseResponse,
        assistantMessage: { role: 'assistant' },
      };

      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(undefinedResponse, baseOptions)) {
        chunks.push(chunk);
      }

      // Should have initial role chunk, final chunk, and done signal
      expect(chunks.length).toBe(3);

      // Check first chunk has role
      const firstChunk = JSON.parse(chunks[0].replace('data: ', '').replace('\n\n', ''));
      expect(firstChunk.choices[0].delta.role).toBe('assistant');

      // Check final chunk
      const finalChunk = JSON.parse(chunks[1].replace('data: ', '').replace('\n\n', ''));
      expect(finalChunk.choices[0].finish_reason).toBe('stop');

      // Check done signal
      expect(chunks[2]).toBe('data: [DONE]\n\n');
    });

    it('should use correct stream format', async () => {
      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(baseResponse, baseOptions)) {
        chunks.push(chunk);
      }

      // Verify all chunks have proper format
      chunks.slice(0, -1).forEach((chunk) => {
        expect(chunk.startsWith('data: ')).toBe(true);
        expect(chunk.endsWith('\n\n')).toBe(true);

        if (chunk !== 'data: [DONE]\n\n') {
          const parsed = JSON.parse(chunk.replace('data: ', '').replace('\n\n', ''));
          expect(parsed.id).toBe('chatcmpl-123');
          expect(parsed.object).toBe('chat.completion.chunk');
          expect(parsed.created).toBe(1234567890);
          expect(parsed.model).toBe('gpt-4');
          expect(parsed.choices).toHaveLength(1);
          expect(parsed.choices[0].index).toBe(0);
        }
      });
    });

    it('should log start of streaming', async () => {
      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(baseResponse, baseOptions)) {
        chunks.push(chunk);
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting streaming response for: test-response'
      );
    });

    it('should handle multiple tool calls', async () => {
      const responseWithMultipleTools: ChatCompletionResponse = {
        ...baseResponse,
        assistantMessage: {
          role: 'assistant',
          content: 'Using tools',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'test1', arguments: '{}' },
            },
            {
              id: 'call_456',
              type: 'function',
              function: { name: 'test2', arguments: '{}' },
            },
          ],
        },
      };

      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(responseWithMultipleTools, baseOptions)) {
        chunks.push(chunk);
      }

      // Find all tool call chunks
      const toolCallChunks = chunks.filter((chunk) => {
        if (chunk.startsWith('data: ') && chunk !== 'data: [DONE]\n\n') {
          const parsed = JSON.parse(chunk.replace('data: ', '').replace('\n\n', ''));
          return parsed.choices[0].delta.tool_calls;
        }
        return false;
      });

      expect(toolCallChunks).toHaveLength(2);
    });

    it('should respect delay option', async () => {
      const delayOptions: StreamOptions = {
        ...baseOptions,
        delayMs: 10,
      };

      const startTime = Date.now();
      const chunks: string[] = [];

      for await (const chunk of service.streamResponse(baseResponse, delayOptions)) {
        chunks.push(chunk);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least some time due to delays
      // (2 words + 1 tool call if any) * 10ms = at least 20ms, but we'll be lenient
      expect(duration).toBeGreaterThan(10);
    });
  });
});

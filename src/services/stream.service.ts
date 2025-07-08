import { IStreamService, ChatCompletionResponse, StreamOptions, ILogger } from '../interfaces';
import { StreamResponse } from '../types';

export class StreamService implements IStreamService {
  constructor(private logger: ILogger) {}

  async *streamResponse(
    response: ChatCompletionResponse,
    options: StreamOptions
  ): AsyncGenerator<string> {
    const streamId = response.id;
    const { model, created, delayMs = 50 } = options;

    this.logger.info(`Starting streaming response for: ${response.matchedResponseId}`);

    // Send initial chunk with role
    const initialChunk: StreamResponse = {
      id: streamId,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant' },
          finish_reason: null,
        },
      ],
    };
    yield `data: ${JSON.stringify(initialChunk)}\n\n`;

    // Stream tool calls if present
    if (response.assistantMessage.tool_calls) {
      for (const toolCall of response.assistantMessage.tool_calls) {
        const toolChunk: StreamResponse = {
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: { tool_calls: [toolCall] },
              finish_reason: null,
            },
          ],
        };
        yield `data: ${JSON.stringify(toolChunk)}\n\n`;
        await this.delay(delayMs);
      }
    }

    // Stream the content word by word
    if (response.assistantMessage.content) {
      const words = response.assistantMessage.content.split(' ');

      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');

        const chunk: StreamResponse = {
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: { content: word },
              finish_reason: null,
            },
          ],
        };

        yield `data: ${JSON.stringify(chunk)}\n\n`;
        await this.delay(delayMs);
      }
    }

    // Send final chunk with finish_reason
    const finalChunk: StreamResponse = {
      id: streamId,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };
    yield `data: ${JSON.stringify(finalChunk)}\n\n`;

    // Send done signal
    yield 'data: [DONE]\n\n';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

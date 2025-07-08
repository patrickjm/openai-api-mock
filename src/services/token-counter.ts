import { get_encoding, Tiktoken, TiktokenEncoding } from 'tiktoken';
import { ITokenCounter, ILogger } from '../interfaces';
import { ChatCompletionRequest, Usage } from '../types';

export class TokenCounter implements ITokenCounter {
  private encoding: Tiktoken;

  constructor(
    private logger: ILogger,
    encodingName: TiktokenEncoding = 'cl100k_base'
  ) {
    this.encoding = get_encoding(encodingName);
  }

  calculateTokens(request: ChatCompletionRequest, responseContent: string): Usage {
    try {
      // Calculate prompt tokens from all messages
      const promptText = this.formatMessagesForTokenCount(request.messages);
      const promptTokens = this.countTokens(promptText);

      // Calculate completion tokens from response content
      const completionTokens = this.countTokens(responseContent);

      return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      };
    } catch (error) {
      this.logger.error('Error calculating tokens', error);
      // Return reasonable defaults if token calculation fails
      return {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
    }
  }

  private formatMessagesForTokenCount(messages: ChatCompletionRequest['messages']): string {
    return messages
      .map((msg) => {
        let content = `${msg.role}: `;

        if (msg.content) {
          content += msg.content;
        }

        if (msg.tool_calls) {
          content += ' [tool_calls: ' + JSON.stringify(msg.tool_calls) + ']';
        }

        if (msg.tool_call_id) {
          content += ' [tool_call_id: ' + msg.tool_call_id + ']';
        }

        return content;
      })
      .join('\n');
  }

  private countTokens(text: string): number {
    if (!text) return 0;
    return this.encoding.encode(text).length;
  }

  dispose(): void {
    this.encoding.free();
  }
}

import {
  IChatCompletionService,
  ILogger,
  ChatCompletionResponse,
  IRequestValidator,
  ITokenCounter,
} from '../interfaces';
import { ChatCompletionRequest, MockResponse } from '../types';
import { MessageMatcherService } from '../matcher';
import { ValidationError } from '../middleware/error.middleware';

export class ChatCompletionService implements IChatCompletionService {
  private matcher: MessageMatcherService;

  constructor(
    private logger: ILogger,
    private validator: IRequestValidator,
    private tokenCounter: ITokenCounter,
    private responses: MockResponse[]
  ) {
    this.matcher = new MessageMatcherService(logger);
  }

  async handleChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Validate request
    const validatedRequest = this.validator.validateChatCompletionRequest(request);

    // Find matching response
    const matchResult = this.matcher.findMatch(validatedRequest, this.responses);

    if (!matchResult) {
      throw new ValidationError('No matching response found for the provided messages');
    }

    const { response: mockResponse, matchedLength } = matchResult;

    // Find the appropriate assistant response for this match
    const assistantResponse = this.matcher.findResponseForMatch(
      mockResponse.messages,
      matchedLength
    );

    if (!assistantResponse) {
      throw new Error('No assistant response found in conversation flow');
    }

    // Validate tool calls if present
    if (assistantResponse.tool_calls) {
      this.validator.validateToolCalls(assistantResponse.tool_calls);
    }

    // Calculate tokens if not streaming
    const usage = !validatedRequest.stream
      ? this.tokenCounter.calculateTokens(validatedRequest, assistantResponse.content || '')
      : undefined;

    this.logger.info(`Matched request to response: ${mockResponse.id}`);

    return {
      id: `chatcmpl-${this.generateId()}`,
      assistantMessage: assistantResponse,
      matchedResponseId: mockResponse.id,
      model: validatedRequest.model,
      usage,
    };
  }

  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

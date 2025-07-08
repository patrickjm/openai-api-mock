import { IRequestValidator, ILogger } from '../interfaces';
import { ChatCompletionRequest, ToolCall } from '../types';
import { ValidationError } from '../middleware/error.middleware';

export class RequestValidator implements IRequestValidator {
  constructor(private logger: ILogger) {}

  validateChatCompletionRequest(request: any): ChatCompletionRequest {
    if (!request || typeof request !== 'object') {
      throw new ValidationError('Request body must be an object');
    }

    // Validate messages
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      throw new ValidationError('messages is required and must be a non-empty array', 'messages');
    }

    // Validate each message
    request.messages.forEach((message: any, index: number) => {
      this.validateMessage(message, index);
    });

    // Validate model
    if (!request.model || typeof request.model !== 'string') {
      throw new ValidationError('model is required and must be a string', 'model');
    }

    // Validate optional parameters
    if (request.max_tokens !== undefined) {
      if (typeof request.max_tokens !== 'number' || request.max_tokens <= 0) {
        throw new ValidationError('max_tokens must be a positive number', 'max_tokens');
      }
    }

    if (request.temperature !== undefined) {
      if (
        typeof request.temperature !== 'number' ||
        request.temperature < 0 ||
        request.temperature > 2
      ) {
        throw new ValidationError('temperature must be a number between 0 and 2', 'temperature');
      }
    }

    if (request.top_p !== undefined) {
      if (typeof request.top_p !== 'number' || request.top_p < 0 || request.top_p > 1) {
        throw new ValidationError('top_p must be a number between 0 and 1', 'top_p');
      }
    }

    if (request.n !== undefined) {
      if (typeof request.n !== 'number' || request.n <= 0 || !Number.isInteger(request.n)) {
        throw new ValidationError('n must be a positive integer', 'n');
      }
    }

    if (request.stream !== undefined && typeof request.stream !== 'boolean') {
      throw new ValidationError('stream must be a boolean', 'stream');
    }

    if (request.stop !== undefined) {
      if (typeof request.stop !== 'string' && !Array.isArray(request.stop)) {
        throw new ValidationError('stop must be a string or array of strings', 'stop');
      }
      if (Array.isArray(request.stop)) {
        request.stop.forEach((s: any) => {
          if (typeof s !== 'string') {
            throw new ValidationError('stop array must contain only strings', 'stop');
          }
        });
      }
    }

    return request as ChatCompletionRequest;
  }

  private validateMessage(message: any, index: number): void {
    if (!message || typeof message !== 'object') {
      throw new ValidationError(`messages[${index}] must be an object`, `messages[${index}]`);
    }

    // Validate role
    const validRoles = ['system', 'user', 'assistant', 'tool'];
    if (!message.role || !validRoles.includes(message.role)) {
      throw new ValidationError(
        `messages[${index}].role must be one of: ${validRoles.join(', ')}`,
        `messages[${index}].role`
      );
    }

    // Validate content based on role
    if (message.role === 'tool') {
      if (!message.tool_call_id || typeof message.tool_call_id !== 'string') {
        throw new ValidationError(
          `messages[${index}].tool_call_id is required for tool messages`,
          `messages[${index}].tool_call_id`
        );
      }
    }

    // Validate tool_calls if present
    if (message.tool_calls) {
      if (!Array.isArray(message.tool_calls)) {
        throw new ValidationError(
          `messages[${index}].tool_calls must be an array`,
          `messages[${index}].tool_calls`
        );
      }
      message.tool_calls.forEach((toolCall: any, toolIndex: number) => {
        this.validateToolCall(toolCall, `messages[${index}].tool_calls[${toolIndex}]`);
      });
    }

    // Ensure either content or tool_calls is present for assistant messages
    if (message.role === 'assistant' && !message.content && !message.tool_calls) {
      throw new ValidationError(
        `messages[${index}] must have either content or tool_calls`,
        `messages[${index}]`
      );
    }
  }

  validateToolCalls(toolCalls?: ToolCall[]): void {
    if (!toolCalls) return;

    toolCalls.forEach((toolCall, index) => {
      this.validateToolCall(toolCall, `tool_calls[${index}]`);
    });
  }

  private validateToolCall(toolCall: any, path: string): void {
    if (!toolCall || typeof toolCall !== 'object') {
      throw new ValidationError(`${path} must be an object`, path);
    }

    // Validate id
    if (!toolCall.id || typeof toolCall.id !== 'string') {
      throw new ValidationError(`${path}.id is required and must be a string`, `${path}.id`);
    }

    // Validate type
    if (toolCall.type !== 'function') {
      throw new ValidationError(`${path}.type must be 'function'`, `${path}.type`);
    }

    // Validate function
    if (!toolCall.function || typeof toolCall.function !== 'object') {
      throw new ValidationError(
        `${path}.function is required and must be an object`,
        `${path}.function`
      );
    }

    // Validate function.name
    if (!toolCall.function.name || typeof toolCall.function.name !== 'string') {
      throw new ValidationError(
        `${path}.function.name is required and must be a string`,
        `${path}.function.name`
      );
    }

    // Validate function.arguments
    if (!toolCall.function.arguments || typeof toolCall.function.arguments !== 'string') {
      throw new ValidationError(
        `${path}.function.arguments is required and must be a string`,
        `${path}.function.arguments`
      );
    }

    // Validate that arguments is valid JSON
    try {
      JSON.parse(toolCall.function.arguments);
    } catch (e) {
      throw new ValidationError(
        `${path}.function.arguments must be a valid JSON string`,
        `${path}.function.arguments`
      );
    }
  }
}

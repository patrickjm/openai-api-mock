export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: any): void;
}

export interface ITokenCounter {
  calculateTokens(request: ChatCompletionRequest, responseContent: string): Usage;
}

export interface IChatCompletionService {
  handleChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}

export interface IStreamService {
  streamResponse(response: ChatCompletionResponse, options: StreamOptions): AsyncGenerator<string>;
}

export interface IRequestValidator {
  validateChatCompletionRequest(request: any): ChatCompletionRequest;
  validateToolCalls(toolCalls?: ToolCall[]): void;
}

export interface IAuthenticationService {
  validateApiKey(apiKey?: string): boolean;
}

export interface IErrorHandler {
  handleError(error: any): OpenAIError;
  formatError(status: number, type: string, message: string, param?: string): OpenAIError;
}

// Request/Response types
import { ChatCompletionRequest, Usage, ToolCall, OpenAIError, ConversationMessage } from './types';

export interface ChatCompletionResponse {
  id: string;
  assistantMessage: ConversationMessage;
  matchedResponseId: string;
  model: string;
  usage?: Usage;
}

export interface StreamOptions {
  model: string;
  created: number;
  delayMs?: number;
}

// Middleware types
export type AsyncMiddleware = (req: any, res: any, next: () => Promise<void>) => Promise<void>;
export type SyncMiddleware = (req: any, res: any, next: () => void) => void;
export type ErrorMiddleware = (error: any, req: any, res: any, next: () => void) => void;

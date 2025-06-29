export interface MockConfig {
  apiKey: string;
  port?: number;
  responses: MockResponse[];
}

export interface MockResponse {
  id: string;
  matcher: MessageMatcher;
  response: OpenAIResponse;
}

export interface MessageMatcher {
  type: 'exact' | 'fuzzy' | 'regex' | 'contains';
  messages: MessagePattern[];
  threshold?: number; // For fuzzy matching (0-1)
  invert?: boolean; // If true, inverts the match result
}

export interface MessagePattern {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
  };
  finish_reason?: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

export interface StreamResponse {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface Choice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter';
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}
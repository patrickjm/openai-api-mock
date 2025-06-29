import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { MockConfig, ChatCompletionRequest, OpenAIError, OpenAIResponse, StreamResponse, Usage } from './types';
import { Logger } from './logger';
import { MessageMatcherService } from './matcher';
import { encoding_for_model } from 'tiktoken';

export class MockServer {
  private app: express.Application;
  private server?: Server;
  private matcher: MessageMatcherService;

  constructor(private config: MockConfig, private logger: Logger) {
    this.app = express();
    this.matcher = new MessageMatcherService(logger);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    
    // CORS middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.debug(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
      });
      next();
    });

    // API key validation - check manually in middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/v1')) {
        this.validateApiKey(req, res, next);
      } else {
        next();
      }
    });
  }

  private validateApiKey(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return this.sendError(res, 401, 'missing_authorization', 'Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (token !== this.config.apiKey) {
      return this.sendError(res, 401, 'invalid_api_key', 'Invalid API key provided');
    }

    next();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // OpenAI Models endpoint
    this.app.get('/v1/models', (req: Request, res: Response) => {
      res.json({
        object: 'list',
        data: [
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'openai-mock',
          },
          {
            id: 'gpt-4',
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: 'openai-mock',
          },
        ],
      });
    });

    // Chat completions endpoint
    this.app.post('/v1/chat/completions', this.handleChatCompletion.bind(this));

    // Catch-all for unsupported endpoints - remove this for now
    this.app.use((req: Request, res: Response) => {
      if (req.path.startsWith('/v1')) {
        this.sendError(res, 404, 'unsupported_endpoint', `Endpoint ${req.path} is not supported`);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', error);
      this.sendError(res, 500, 'internal_error', 'Internal server error');
    });
  }

  private async handleChatCompletion(req: Request, res: Response): Promise<void> {
    try {
      const request = req.body as ChatCompletionRequest;
      
      // Validate request
      if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
        return this.sendError(res, 400, 'invalid_request_error', 'messages is required and must be a non-empty array');
      }

      if (!request.model) {
        return this.sendError(res, 400, 'invalid_request_error', 'model is required');
      }

      // Find matching response
      const matchingMatcher = this.matcher.findMatch(request, this.config.responses.map(r => r.matcher));
      
      if (!matchingMatcher) {
        return this.sendError(res, 400, 'no_match_found', 'No matching response found for the provided messages');
      }

      // Find the corresponding response
      const mockResponse = this.config.responses.find(r => r.matcher === matchingMatcher);
      
      if (!mockResponse) {
        return this.sendError(res, 500, 'internal_error', 'Internal configuration error');
      }

      // Handle streaming vs non-streaming
      if (request.stream) {
        await this.handleStreamingResponse(res, mockResponse, request);
      } else {
        // Calculate tokens dynamically
        const responseContent = mockResponse.response.choices[0]?.message?.content || '';
        const usage = this.calculateTokens(request, responseContent);

        // Create OpenAI-compatible response
        const response: OpenAIResponse & { usage: Usage } = {
          ...mockResponse.response,
          id: `chatcmpl-${this.generateId()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          usage,
        };

        this.logger.info(`Matched request to response: ${mockResponse.id}`);
        res.json(response);
      }

    } catch (error) {
      this.logger.error('Error handling chat completion', error);
      this.sendError(res, 500, 'internal_error', 'Internal server error');
    }
  }

  private sendError(res: Response, status: number, type: string, message: string, param?: string): void {
    const error: OpenAIError = {
      error: {
        message,
        type,
        param,
        code: type,
      },
    };

    this.logger.warn(`Sending error response: ${status} ${type}`, error);
    res.status(status).json(error);
  }

  private async handleStreamingResponse(res: Response, mockResponse: any, request: ChatCompletionRequest): Promise<void> {
    const streamId = `chatcmpl-${this.generateId()}`;
    const created = Math.floor(Date.now() / 1000);
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    this.logger.info(`Starting streaming response for: ${mockResponse.id}`);

    // Send initial chunk with role
    const initialChunk: StreamResponse = {
      id: streamId,
      object: 'chat.completion.chunk',
      created,
      model: request.model,
      choices: [{
        index: 0,
        delta: { role: 'assistant' },
        finish_reason: null,
      }],
    };
    res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

    // Stream the content word by word
    const content = mockResponse.response.choices[0].message.content;
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      
      const chunk: StreamResponse = {
        id: streamId,
        object: 'chat.completion.chunk',
        created,
        model: request.model,
        choices: [{
          index: 0,
          delta: { content: word },
          finish_reason: null,
        }],
      };
      
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      // Add a small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Send final chunk with finish_reason
    const finalChunk: StreamResponse = {
      id: streamId,
      object: 'chat.completion.chunk',
      created,
      model: request.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    };
    res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    
    // Send done signal
    res.write('data: [DONE]\n\n');
    res.end();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private calculateTokens(request: ChatCompletionRequest, responseContent: string): Usage {
    try {
      const encoding = encoding_for_model(request.model as any);
      
      // Calculate prompt tokens from all messages
      const promptText = request.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const promptTokens = encoding.encode(promptText).length;
      
      // Calculate completion tokens from response content
      const completionTokens = encoding.encode(responseContent).length;
      
      encoding.free();
      
      return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      };
    } catch (error) {
      // Fallback to basic estimation if model encoding fails
      this.logger.warn(`Token calculation failed for model ${request.model}, using fallback`, error);
      
      const promptText = request.messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const promptTokens = Math.ceil(promptText.length / 4); // Rough estimation: 4 chars per token
      const completionTokens = Math.ceil(responseContent.length / 4);
      
      return {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      };
    }
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          this.logger.info(`Server started on port ${port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          this.logger.error('Server error', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
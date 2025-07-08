import express, { Request, Response, NextFunction, Application } from 'express';
import { Server } from 'http';
import { MockConfig, ChatCompletionRequest, OpenAIResponse, Usage } from './types';
import { Logger } from './logger';
import {
  ILogger,
  IChatCompletionService,
  IStreamService,
  ITokenCounter,
  IRequestValidator,
  IAuthenticationService,
  IErrorHandler,
  ChatCompletionResponse,
} from './interfaces';
import { AuthenticationMiddleware, AuthenticationService } from './middleware/auth.middleware';
import {
  ErrorHandlingMiddleware,
  ErrorHandler,
  ValidationError,
} from './middleware/error.middleware';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { ChatCompletionService } from './services/chat-completion.service';
import { StreamService } from './services/stream.service';
import { TokenCounter } from './services/token-counter';
import { RequestValidator } from './services/request-validator';

export class MockServer {
  private app: Application;
  private server?: Server;
  private chatCompletionService: IChatCompletionService;
  private streamService: IStreamService;
  private tokenCounter: ITokenCounter;
  private validator: IRequestValidator;
  private authService: IAuthenticationService;
  private errorHandler: IErrorHandler;

  constructor(
    private config: MockConfig,
    private logger: ILogger
  ) {
    this.app = express();

    // Initialize services
    this.tokenCounter = new TokenCounter(logger);
    this.validator = new RequestValidator(logger);
    this.authService = new AuthenticationService(config.apiKey);
    this.errorHandler = new ErrorHandler(logger);
    this.chatCompletionService = new ChatCompletionService(
      logger,
      this.validator,
      this.tokenCounter,
      config.responses
    );
    this.streamService = new StreamService(logger);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json());

    // CORS
    this.app.use(this.createCorsMiddleware());

    // Logging
    const loggingMiddleware = new LoggingMiddleware(this.logger);
    this.app.use(loggingMiddleware.middleware());

    // Authentication
    const authMiddleware = new AuthenticationMiddleware(this.authService, this.logger);
    this.app.use(authMiddleware.middleware());
  }

  private createCorsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    };
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
    this.app.post('/v1/chat/completions', this.asyncHandler(this.handleChatCompletion.bind(this)));

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      if (req.path.startsWith('/v1')) {
        throw new ValidationError(`Endpoint ${req.path} is not supported`);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });
  }

  private setupErrorHandling(): void {
    const errorMiddleware = new ErrorHandlingMiddleware(this.errorHandler, this.logger);
    this.app.use(errorMiddleware.middleware());
  }

  private asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  private async handleChatCompletion(req: Request, res: Response): Promise<void> {
    const request = req.body as ChatCompletionRequest;

    // Handle chat completion through service
    const response = await this.chatCompletionService.handleChatCompletion(request);

    // Handle streaming vs non-streaming
    if (request.stream) {
      await this.handleStreamingResponse(res, response, request);
    } else {
      // Create OpenAI-compatible response
      const openAIResponse: OpenAIResponse & { usage: Usage } = {
        id: response.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response.assistantMessage.content,
              tool_calls: response.assistantMessage.tool_calls,
            },
            finish_reason: 'stop',
          },
        ],
        usage: response.usage!,
      };

      res.json(openAIResponse);
    }
  }

  private async handleStreamingResponse(
    res: Response,
    response: ChatCompletionResponse,
    request: ChatCompletionRequest
  ): Promise<void> {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const streamOptions = {
      model: request.model,
      created: Math.floor(Date.now() / 1000),
      delayMs: 50,
    };

    // Stream the response
    for await (const chunk of this.streamService.streamResponse(response, streamOptions)) {
      res.write(chunk);
    }

    res.end();
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
      if (this.tokenCounter && 'dispose' in this.tokenCounter) {
        (this.tokenCounter as TokenCounter).dispose();
      }

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

import { Request, Response, NextFunction } from 'express';
import { IAuthenticationService, ILogger } from '../interfaces';
import { OpenAIError } from '../types';

export class AuthenticationMiddleware {
  constructor(
    private authService: IAuthenticationService,
    private logger: ILogger
  ) {}

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip auth for non-API routes
      if (!req.path.startsWith('/v1')) {
        return next();
      }

      const authHeader = req.headers.authorization;

      if (!authHeader) {
        this.logger.warn('Missing authorization header');
        return this.sendUnauthorized(res, 'Authorization header is required');
      }

      const token = authHeader.replace('Bearer ', '');

      if (!this.authService.validateApiKey(token)) {
        this.logger.warn('Invalid API key provided');
        return this.sendUnauthorized(res, 'Invalid API key provided');
      }

      next();
    };
  }

  private sendUnauthorized(res: Response, message: string): void {
    const error: OpenAIError = {
      error: {
        message,
        type: 'invalid_request_error',
        code: 'invalid_api_key',
      },
    };
    res.status(401).json(error);
  }
}

export class AuthenticationService implements IAuthenticationService {
  constructor(private apiKey: string) {}

  validateApiKey(apiKey?: string): boolean {
    return apiKey === this.apiKey;
  }
}

import { Request, Response, NextFunction } from 'express';
import { IErrorHandler, ILogger } from '../interfaces';
import { OpenAIError } from '../types';

export class ErrorHandlingMiddleware {
  constructor(
    private errorHandler: IErrorHandler,
    private logger: ILogger
  ) {}

  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', error);

      const openAIError = this.errorHandler.handleError(error);
      const status = this.getStatusFromError(error);

      res.status(status).json(openAIError);
    };
  }

  private getStatusFromError(error: any): number {
    if (error.status) return error.status;
    if (error.statusCode) return error.statusCode;
    if (error.name === 'ValidationError') return 400;
    return 500;
  }
}

export class ErrorHandler implements IErrorHandler {
  constructor(private logger: ILogger) {}

  handleError(error: any): OpenAIError {
    // Check if it's already an OpenAI error
    if (error.error && error.error.type) {
      return error;
    }

    // Map common errors
    if (error.name === 'ValidationError') {
      return this.formatError(400, 'invalid_request_error', error.message, error.param);
    }

    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return this.formatError(400, 'invalid_request_error', 'Invalid JSON in request body');
    }

    // Default to internal error
    return this.formatError(500, 'internal_error', 'Internal server error');
  }

  formatError(status: number, type: string, message: string, param?: string): OpenAIError {
    return {
      error: {
        message,
        type,
        param,
        code: type,
      },
    };
  }
}

export class ValidationError extends Error {
  status = 400;

  constructor(
    message: string,
    public param?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

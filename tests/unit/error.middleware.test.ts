import {
  ErrorHandlingMiddleware,
  ErrorHandler,
  ValidationError,
} from '../../src/middleware/error.middleware';
import { ILogger } from '../../src/interfaces';

describe('ErrorHandlingMiddleware', () => {
  let middleware: ErrorHandlingMiddleware;
  let mockErrorHandler: any;
  let mockLogger: ILogger;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockErrorHandler = {
      handleError: jest.fn(),
    };
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    middleware = new ErrorHandlingMiddleware(mockErrorHandler, mockLogger);
  });

  describe('middleware', () => {
    it('should handle error and return appropriate response', () => {
      const error = new Error('Test error');
      const openAIError = {
        error: {
          message: 'Test error',
          type: 'internal_error',
          code: 'internal_error',
        },
      };

      mockErrorHandler.handleError.mockReturnValue(openAIError);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(error, mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled error', error);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(openAIError);
    });

    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Validation failed');
      const openAIError = {
        error: {
          message: 'Validation failed',
          type: 'invalid_request_error',
          code: 'invalid_request_error',
        },
      };

      mockErrorHandler.handleError.mockReturnValue(openAIError);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle error with custom status', () => {
      const error = new Error('Custom error');
      (error as any).status = 422;
      const openAIError = {
        error: {
          message: 'Custom error',
          type: 'custom_error',
          code: 'custom_error',
        },
      };

      mockErrorHandler.handleError.mockReturnValue(openAIError);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it('should handle error with statusCode property', () => {
      const error = new Error('Another error');
      (error as any).statusCode = 403;
      const openAIError = {
        error: {
          message: 'Another error',
          type: 'forbidden_error',
          code: 'forbidden_error',
        },
      };

      mockErrorHandler.handleError.mockReturnValue(openAIError);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('handleError', () => {
    it('should return existing OpenAI error unchanged', () => {
      const openAIError = {
        error: {
          message: 'Existing error',
          type: 'existing_error',
          code: 'existing_error',
        },
      };

      const result = errorHandler.handleError(openAIError);

      expect(result).toBe(openAIError);
    });

    it('should handle ValidationError', () => {
      const validationError = new ValidationError('Validation failed', 'test_param');

      const result = errorHandler.handleError(validationError);

      expect(result).toEqual({
        error: {
          message: 'Validation failed',
          type: 'invalid_request_error',
          param: 'test_param',
          code: 'invalid_request_error',
        },
      });
    });

    it('should handle ValidationError without param', () => {
      const validationError = new ValidationError('Validation failed');

      const result = errorHandler.handleError(validationError);

      expect(result).toEqual({
        error: {
          message: 'Validation failed',
          type: 'invalid_request_error',
          param: undefined,
          code: 'invalid_request_error',
        },
      });
    });

    it('should handle JSON SyntaxError', () => {
      const syntaxError = new SyntaxError('Unexpected token in JSON');

      const result = errorHandler.handleError(syntaxError);

      expect(result).toEqual({
        error: {
          message: 'Invalid JSON in request body',
          type: 'invalid_request_error',
          param: undefined,
          code: 'invalid_request_error',
        },
      });
    });

    it('should handle generic Error', () => {
      const genericError = new Error('Generic error');

      const result = errorHandler.handleError(genericError);

      expect(result).toEqual({
        error: {
          message: 'Internal server error',
          type: 'internal_error',
          param: undefined,
          code: 'internal_error',
        },
      });
    });

    it('should handle non-Error objects', () => {
      const stringError = 'String error';

      const result = errorHandler.handleError(stringError);

      expect(result).toEqual({
        error: {
          message: 'Internal server error',
          type: 'internal_error',
          param: undefined,
          code: 'internal_error',
        },
      });
    });
  });

  describe('formatError', () => {
    it('should format error with all parameters', () => {
      const result = errorHandler.formatError(400, 'test_error', 'Test message', 'test_param');

      expect(result).toEqual({
        error: {
          message: 'Test message',
          type: 'test_error',
          param: 'test_param',
          code: 'test_error',
        },
      });
    });

    it('should format error without param', () => {
      const result = errorHandler.formatError(500, 'server_error', 'Server error');

      expect(result).toEqual({
        error: {
          message: 'Server error',
          type: 'server_error',
          param: undefined,
          code: 'server_error',
        },
      });
    });
  });
});

describe('ValidationError', () => {
  it('should create ValidationError with message and param', () => {
    const error = new ValidationError('Test validation error', 'test_param');

    expect(error.message).toBe('Test validation error');
    expect(error.param).toBe('test_param');
    expect(error.name).toBe('ValidationError');
    expect(error.status).toBe(400);
  });

  it('should create ValidationError with message only', () => {
    const error = new ValidationError('Test validation error');

    expect(error.message).toBe('Test validation error');
    expect(error.param).toBeUndefined();
    expect(error.name).toBe('ValidationError');
    expect(error.status).toBe(400);
  });

  it('should be instanceof Error', () => {
    const error = new ValidationError('Test');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });
});

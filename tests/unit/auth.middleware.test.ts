import {
  AuthenticationMiddleware,
  AuthenticationService,
} from '../../src/middleware/auth.middleware';
import { ILogger } from '../../src/interfaces';

describe('AuthenticationMiddleware', () => {
  let middleware: AuthenticationMiddleware;
  let mockAuthService: any;
  let mockLogger: ILogger;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockAuthService = {
      validateApiKey: jest.fn(),
    };
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    mockReq = {
      path: '/v1/chat/completions',
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    middleware = new AuthenticationMiddleware(mockAuthService, mockLogger);
  });

  describe('middleware', () => {
    it('should skip auth for non-API routes', () => {
      mockReq.path = '/health';
      const middlewareFunc = middleware.middleware();

      middlewareFunc(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockAuthService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', () => {
      const middlewareFunc = middleware.middleware();

      middlewareFunc(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Authorization header is required',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing authorization header');
    });

    it('should return 401 for invalid API key', () => {
      mockReq.headers.authorization = 'Bearer invalid-key';
      mockAuthService.validateApiKey.mockReturnValue(false);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(mockReq, mockRes, mockNext);

      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith('invalid-key');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid API key provided');
    });

    it('should call next for valid API key', () => {
      mockReq.headers.authorization = 'Bearer valid-key';
      mockAuthService.validateApiKey.mockReturnValue(true);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(mockReq, mockRes, mockNext);

      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle bearer token without Bearer prefix', () => {
      mockReq.headers.authorization = 'test-key';
      mockAuthService.validateApiKey.mockReturnValue(true);
      const middlewareFunc = middleware.middleware();

      middlewareFunc(mockReq, mockRes, mockNext);

      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith('test-key');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  const testApiKey = 'test-api-key-123';

  beforeEach(() => {
    service = new AuthenticationService(testApiKey);
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', () => {
      expect(service.validateApiKey(testApiKey)).toBe(true);
    });

    it('should return false for invalid API key', () => {
      expect(service.validateApiKey('invalid-key')).toBe(false);
    });

    it('should return false for undefined API key', () => {
      expect(service.validateApiKey(undefined)).toBe(false);
    });

    it('should return false for null API key', () => {
      expect(service.validateApiKey(null as any)).toBe(false);
    });

    it('should return false for empty string API key', () => {
      expect(service.validateApiKey('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(service.validateApiKey(testApiKey.toUpperCase())).toBe(false);
    });
  });
});

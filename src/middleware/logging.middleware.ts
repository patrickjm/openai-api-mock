import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../interfaces';

export class LoggingMiddleware {
  constructor(private logger: ILogger) {}

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const requestId = this.generateRequestId();

      // Log request
      this.logger.debug(`[${requestId}] ${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body,
        query: req.query,
      });

      // Capture response
      const originalSend = res.send;
      const logger = this.logger;
      res.send = function (data: any) {
        res.send = originalSend;

        const duration = Date.now() - start;
        logger.debug(`[${requestId}] Response ${res.statusCode} (${duration}ms)`, {
          statusCode: res.statusCode,
          duration,
        });

        return res.send(data);
      };

      next();
    };
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}

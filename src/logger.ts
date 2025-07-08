import winston from 'winston';

export class Logger {
  private logger: winston.Logger;

  constructor(logFile?: string, verbose: boolean = false) {
    const transports: winston.transport[] = [];

    if (logFile) {
      transports.push(
        new winston.transports.File({
          filename: logFile,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      );
    }

    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      })
    );

    this.logger = winston.createLogger({
      level: verbose ? 'debug' : 'info',
      transports,
    });
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }
}

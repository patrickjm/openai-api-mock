import { MockServer } from './server';
import { ConfigLoader } from './config';
import { Logger } from './logger';
import { MockConfig } from './types';
import * as YAML from 'yaml';

export interface CreateMockServerOptions {
  config: MockConfig | string;
  port?: number;
  verbose?: boolean;
  logFile?: string;
}

export interface MockServerInstance {
  server: MockServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  port: number;
}

/**
 * Creates and starts a mock OpenAI API server programmatically
 * @param options Configuration options
 * @returns Promise resolving to a MockServerInstance
 */
export async function createMockServer(options: CreateMockServerOptions): Promise<MockServerInstance> {
  const logger = new Logger(options.logFile, options.verbose);
  
  let config: MockConfig;
  
  if (typeof options.config === 'string') {
    // Parse YAML string
    try {
      config = YAML.parse(options.config) as MockConfig;
    } catch (error) {
      throw new Error(`Failed to parse YAML configuration: ${error}`);
    }
  } else {
    config = options.config;
  }
  
  // Validate config
  const configLoader = new ConfigLoader(logger);
  // Use private method via any cast to validate
  (configLoader as any).validateConfig(config);
  
  const server = new MockServer(config, logger);
  const port = options.port || config.port || 3000;
  
  return {
    server,
    port,
    start: async () => {
      await server.start(port);
      logger.info(`Mock OpenAI API server started on port ${port}`);
    },
    stop: async () => {
      await server.stop();
      logger.info('Mock OpenAI API server stopped');
    }
  };
}

/**
 * Creates and immediately starts a mock OpenAI API server
 * @param options Configuration options
 * @returns Promise resolving to a MockServerInstance
 */
export async function startMockServer(options: CreateMockServerOptions): Promise<MockServerInstance> {
  const instance = await createMockServer(options);
  await instance.start();
  return instance;
}
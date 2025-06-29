#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigLoader } from './config';
import { Logger } from './logger';
import { MockServer } from './server';

const program = new Command();

program
  .name('openai-mock-api')
  .description('A mock OpenAI API server for testing LLM applications')
  .version('1.0.0')
  .requiredOption('-c, --config <path>', 'Path to YAML configuration file')
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('-l, --log-file <path>', 'Path to log file (defaults to stdout)')
  .option('-v, --verbose', 'Enable verbose logging')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    const logger = new Logger(options.logFile, options.verbose);
    const configLoader = new ConfigLoader(logger);
    const config = await configLoader.load(options.config);
    
    const server = new MockServer(config, logger);
    const port = parseInt(options.port) || config.port || 3000;
    
    await server.start(port);
    logger.info(`Mock OpenAI API server started on port ${port}`);
    
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
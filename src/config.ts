import { readFileSync } from 'fs';
import YAML from 'yaml';
import { MockConfig } from './types';
import { Logger } from './logger';

export class ConfigLoader {
  constructor(private logger: Logger) {}

  async load(configPath: string): Promise<MockConfig> {
    try {
      let fileContent: string;
      
      if (configPath === '-') {
        this.logger.debug('Loading configuration from stdin');
        fileContent = await this.readFromStdin();
      } else {
        this.logger.debug(`Loading configuration from ${configPath}`);
        fileContent = readFileSync(configPath, 'utf-8');
      }
      
      const config = YAML.parse(fileContent) as MockConfig;
      
      this.validateConfig(config);
      
      this.logger.debug('Configuration loaded successfully', {
        responseCount: config.responses.length,
        port: config.port,
      });
      
      return config;
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error}`);
      const source = configPath === '-' ? 'stdin' : configPath;
      throw new Error(`Failed to load configuration from ${source}: ${error}`);
    }
  }

  private readFromStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      
      process.stdin.on('end', () => {
        resolve(data);
      });
      
      process.stdin.on('error', (err) => {
        reject(err);
      });
      
      // Start reading
      process.stdin.resume();
    });
  }

  private validateConfig(config: MockConfig): void {
    if (!config.apiKey) {
      throw new Error('Configuration must include an apiKey');
    }

    if (!config.responses || !Array.isArray(config.responses)) {
      throw new Error('Configuration must include a responses array');
    }

    if (config.responses.length === 0) {
      throw new Error('Configuration must include at least one response');
    }

    for (const [index, response] of config.responses.entries()) {
      if (!response.id) {
        throw new Error(`Response at index ${index} must have an id`);
      }

      if (!response.messages || !Array.isArray(response.messages)) {
        throw new Error(`Response ${response.id} must have a messages array`);
      }

      if (response.messages.length === 0) {
        throw new Error(`Response ${response.id} must have at least one message`);
      }

      for (const [msgIndex, message] of response.messages.entries()) {
        if (!['system', 'user', 'assistant', 'tool'].includes(message.role)) {
          throw new Error(`Response ${response.id} message ${msgIndex} role must be 'system', 'user', 'assistant', or 'tool'`);
        }

        if (message.matcher && !['exact', 'fuzzy', 'regex', 'contains', 'any'].includes(message.matcher)) {
          throw new Error(`Response ${response.id} message ${msgIndex} matcher type must be 'exact', 'fuzzy', 'regex', 'contains', or 'any'`);
        }

        if (message.matcher === 'fuzzy' && typeof message.threshold !== 'number') {
          throw new Error(`Response ${response.id} message ${msgIndex} fuzzy matcher must have a threshold number`);
        }

        if (message.matcher === 'any' && message.content !== undefined) {
          throw new Error(`Response ${response.id} message ${msgIndex} with 'any' matcher should not have content`);
        }

        if (message.matcher !== 'any' && message.role !== 'assistant' && !message.content && !message.tool_calls) {
          throw new Error(`Response ${response.id} message ${msgIndex} must have content or tool_calls`);
        }

        if (message.role === 'tool' && !message.tool_call_id) {
          throw new Error(`Response ${response.id} message ${msgIndex} with role 'tool' must have tool_call_id`);
        }
      }

      // Validate that there's at least one assistant message to use as response
      const assistantMessages = response.messages.filter(msg => msg.role === 'assistant');
      if (assistantMessages.length === 0) {
        throw new Error(`Response ${response.id} must have at least one assistant message`);
      }
    }
  }
}
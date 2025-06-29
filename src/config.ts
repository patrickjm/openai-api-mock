import { readFileSync } from 'fs';
import YAML from 'yaml';
import { MockConfig } from './types';
import { Logger } from './logger';

export class ConfigLoader {
  constructor(private logger: Logger) {}

  async load(configPath: string): Promise<MockConfig> {
    try {
      this.logger.debug(`Loading configuration from ${configPath}`);
      
      const fileContent = readFileSync(configPath, 'utf-8');
      const config = YAML.parse(fileContent) as MockConfig;
      
      this.validateConfig(config);
      
      this.logger.debug('Configuration loaded successfully', {
        responseCount: config.responses.length,
        port: config.port,
      });
      
      return config;
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error}`);
      throw new Error(`Failed to load configuration from ${configPath}: ${error}`);
    }
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

      if (!response.matcher) {
        throw new Error(`Response ${response.id} must have a matcher`);
      }

      if (!['exact', 'fuzzy', 'regex', 'contains'].includes(response.matcher.type)) {
        throw new Error(`Response ${response.id} matcher type must be 'exact', 'fuzzy', 'regex', or 'contains'`);
      }

      if (!response.matcher.messages || !Array.isArray(response.matcher.messages)) {
        throw new Error(`Response ${response.id} matcher must have a messages array`);
      }

      if (response.matcher.type === 'fuzzy' && typeof response.matcher.threshold !== 'number') {
        throw new Error(`Response ${response.id} fuzzy matcher must have a threshold number`);
      }

      if (!response.response) {
        throw new Error(`Response ${response.id} must have a response object`);
      }
    }
  }
}
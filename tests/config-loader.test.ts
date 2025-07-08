import { ConfigLoader } from '../src/config';
import { Logger } from '../src/logger';
import { Readable } from 'stream';

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger();
    mockLogger.info = jest.fn();
    mockLogger.debug = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.warn = jest.fn();
    configLoader = new ConfigLoader(mockLogger);
  });

  describe('stdin support', () => {
    const originalStdin = process.stdin;

    afterEach(() => {
      // Restore original stdin
      Object.defineProperty(process, 'stdin', {
        value: originalStdin,
        writable: true,
        configurable: true
      });
    });

    it('should load configuration from stdin when path is "-"', async () => {
      const yamlContent = `
apiKey: test-key
port: 3000
responses:
  - id: test-response
    messages:
      - role: user
        content: Hello
      - role: assistant
        content: Hi there!
`;

      // Create a mock stdin stream
      const mockStdin = new Readable({
        read() {
          this.push(yamlContent);
          this.push(null); // End the stream
        }
      });

      // Replace process.stdin with our mock
      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true
      });

      const config = await configLoader.load('-');

      expect(config.apiKey).toBe('test-key');
      expect(config.port).toBe(3000);
      expect(config.responses).toHaveLength(1);
      expect(config.responses[0].id).toBe('test-response');
      expect(config.responses[0].messages).toHaveLength(2);
    });

    it('should handle invalid YAML from stdin', async () => {
      const invalidYaml = `
apiKey: test-key
invalid yaml content [[[
`;

      const mockStdin = new Readable({
        read() {
          this.push(invalidYaml);
          this.push(null);
        }
      });

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true
      });

      await expect(configLoader.load('-')).rejects.toThrow('Failed to load configuration from stdin');
    });

    it('should handle empty stdin', async () => {
      const mockStdin = new Readable({
        read() {
          this.push(null); // Empty stream
        }
      });

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true
      });

      await expect(configLoader.load('-')).rejects.toThrow('Failed to load configuration from stdin');
    });
  });
});
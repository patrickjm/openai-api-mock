import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { ConfigLoader, Logger, MockServer } from '../src';

describe('Matcher Priority and Edge Cases', () => {
  let server: MockServer;
  let openai: OpenAI;
  const testPort = 3002;
  const testConfigPath = path.join(__dirname, 'test-priority-config.yaml');

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('Matcher Prioritization Issues', () => {
    test('should correctly prioritize specific matchers over any matcher regardless of order', async () => {
      // Configuration with 'any' matcher BEFORE specific matchers
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "any-catch-all"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "This is the ANY matcher response"

  - id: "specific-greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "This is the SPECIFIC greeting response"

  - id: "contains-hello"
    messages:
      - role: "user"
        content: "hello"
        matcher: "contains"
      - role: "assistant"
        content: "This is the CONTAINS hello response"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test 1: Specific exact match correctly wins over 'any'
      const response1 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      });
      expect(response1.choices[0].message.content).toBe("This is the SPECIFIC greeting response");

      // Test 2: Contains match correctly wins over 'any'
      const response2 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'hello world' }],
      });
      expect(response2.choices[0].message.content).toBe("This is the CONTAINS hello response");
    });

    test('should work correctly when any matcher is placed last', async () => {
      // Configuration with 'any' matcher AFTER specific matchers
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "specific-greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "This is the SPECIFIC greeting response"

  - id: "contains-hello"
    messages:
      - role: "user"
        content: "hello"
        matcher: "contains"
      - role: "assistant"
        content: "This is the CONTAINS hello response"

  - id: "any-catch-all"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "This is the ANY matcher response"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test 1: Specific exact match correctly matches
      const response1 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      });
      expect(response1.choices[0].message.content).toBe("This is the SPECIFIC greeting response");

      // Test 2: Contains match correctly matches
      const response2 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'hello world' }],
      });
      expect(response2.choices[0].message.content).toBe("This is the CONTAINS hello response");

      // Test 3: Unmatched content falls back to 'any'
      const response3 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'something completely different' }],
      });
      expect(response3.choices[0].message.content).toBe("This is the ANY matcher response");
    });
  });

  describe('Multiple Matcher Conflicts', () => {
    test('should prioritize exact match over contains match', async () => {
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "contains-weather-1"
    messages:
      - role: "user"
        content: "weather"
        matcher: "contains"
      - role: "assistant"
        content: "First weather response"

  - id: "contains-weather-2"
    messages:
      - role: "user"
        content: "weather"
        matcher: "contains"
      - role: "assistant"
        content: "Second weather response"

  - id: "exact-weather"
    messages:
      - role: "user"
        content: "What is the weather today?"
      - role: "assistant"
        content: "Exact weather response"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test: Message that could match multiple patterns
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'What is the weather today?' }],
      });
      
      // Exact match wins due to higher score
      expect(response.choices[0].message.content).toBe("Exact weather response");
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content with any matcher', async () => {
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "any-empty"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "Response to any message including empty"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test with empty content
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: '' }],
      });
      
      expect(response.choices[0].message.content).toBe("Response to any message including empty");
    });

    test('should handle very long messages with contains matcher', async () => {
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "contains-keyword"
    messages:
      - role: "user"
        content: "important"
        matcher: "contains"
      - role: "assistant"
        content: "Found the important keyword"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test with very long message containing the keyword
      const longMessage = 'A'.repeat(1000) + ' important ' + 'B'.repeat(1000);
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: longMessage }],
      });
      
      expect(response.choices[0].message.content).toBe("Found the important keyword");
    });

    test('should handle case sensitivity in contains matcher', async () => {
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "contains-hello"
    messages:
      - role: "user"
        content: "hello"
        matcher: "contains"
      - role: "assistant"
        content: "Found hello"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test different cases
      const testCases = ['HELLO', 'Hello', 'HeLLo', 'hello'];
      for (const testCase of testCases) {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testCase }],
        });
        
        expect(response.choices[0].message.content).toBe("Found hello");
      }
    });

    test('should handle regex special characters properly', async () => {
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "regex-special"
    messages:
      - role: "user"
        content: "\\\\$\\\\d+\\\\.\\\\d{2}"
        matcher: "regex"
      - role: "assistant"
        content: "Found price pattern"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test regex matching price pattern
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'The price is $123.45' }],
      });
      
      expect(response.choices[0].message.content).toBe("Found price pattern");
    });

    test('should handle multi-turn conversations with mixed matchers', async () => {
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "mixed-conversation"
    messages:
      - role: "user"
        content: "start"
        matcher: "contains"
      - role: "assistant"
        content: "Starting conversation"
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "Continuing with any input"
      - role: "user"
        content: ".*end.*"
        matcher: "regex"
      - role: "assistant"
        content: "Ending conversation"
`;

      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);

      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Test partial match at different points
      const response1 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'start the process' }
        ],
      });
      expect(response1.choices[0].message.content).toBe("Ending conversation");

      const response2 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'start the process' },
          { role: 'assistant', content: 'Starting conversation' },
          { role: 'user', content: 'anything at all' }
        ],
      });
      expect(response2.choices[0].message.content).toBe("Ending conversation");

      const response3 = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'start the process' },
          { role: 'assistant', content: 'Starting conversation' },
          { role: 'user', content: 'anything at all' },
          { role: 'assistant', content: 'Continuing with any input' },
          { role: 'user', content: 'please end this' }
        ],
      });
      expect(response3.choices[0].message.content).toBe("Ending conversation");
    });
  });

});
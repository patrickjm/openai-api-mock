import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { ConfigLoader, Logger, MockServer } from '../src';

describe('OpenAI Mock API E2E Tests', () => {
  let server: MockServer;
  let openai: OpenAI;
  const testPort = 3001;
  const testConfigPath = path.join(__dirname, 'test-config.yaml');

  beforeAll(async () => {
    // Create test configuration
    const testConfig = `
apiKey: "test-api-key-12345"
port: ${testPort}
responses:
  - id: "exact-greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "Hello! I'm doing well, thank you for asking."

  - id: "fuzzy-help"
    messages:
      - role: "user"
        content: "I need help with something"
        matcher: "fuzzy"
        threshold: 0.4
      - role: "assistant"
        content: "I'd be happy to help!"

  - id: "regex-code"
    messages:
      - role: "user"
        content: ".*code.*python.*"
        matcher: "regex"
      - role: "assistant"
        content: "Here's some Python code for you!"

  - id: "conversation-flow"
    messages:
      - role: "user"
        content: "Start conversation"
      - role: "assistant"
        content: "Hello! How can I help you?"
      - role: "user"
        content: "Tell me about the weather"
      - role: "assistant"
        content: "The weather is sunny and warm today!"

  - id: "contains-weather"
    messages:
      - role: "user"
        content: "weather"
        matcher: "contains"
      - role: "assistant"
        content: "The weather is nice today!"

  - id: "any-user-message"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "This matches any user message!"

  - id: "specific-unmatched"
    messages:
      - role: "system"
        content: "This exact system message should not be used"
      - role: "assistant"
        content: "This should not match"
`;

    fs.writeFileSync(testConfigPath, testConfig);

    // Start mock server
    const logger = new Logger();
    const configLoader = new ConfigLoader(logger);
    const config = await configLoader.load(testConfigPath);

    server = new MockServer(config, logger);
    await server.start(testPort);

    // Initialize OpenAI client pointing to mock server
    openai = new OpenAI({
      apiKey: 'test-api-key-12345',
      baseURL: `http://localhost:${testPort}/v1`,
    });
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('Authentication', () => {
    test('should reject requests with invalid API key', async () => {
      const invalidClient = new OpenAI({
        apiKey: 'invalid-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      await expect(
        invalidClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow();
    });

    test('should accept requests with valid API key', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      });

      expect(response).toBeDefined();
      expect(response.choices[0].message.content).toBe(
        "Hello! I'm doing well, thank you for asking."
      );
    });
  });

  describe('Message Matching', () => {
    test('should match exact messages', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      });

      expect(response.choices[0].message.content).toBe(
        "Hello! I'm doing well, thank you for asking."
      );
      expect(response.usage).toBeDefined();
      expect(response.usage?.total_tokens).toBeGreaterThan(0);
      expect(response.usage?.prompt_tokens).toBeGreaterThan(0);
      expect(response.usage?.completion_tokens).toBeGreaterThan(0);
    });

    test('should match fuzzy messages', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'I need assistance with something' }],
      });

      expect(response.choices[0].message.content).toBe("I'd be happy to help!");
    });

    test('should match regex patterns', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Show me some code in python please' }],
      });

      expect(response.choices[0].message.content).toBe("Here's some Python code for you!");
    });

    test('should match contains patterns', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'What is the weather like today?' }],
      });

      expect(response.choices[0].message.content).toBe('The weather is nice today!');
    });

    test('should handle "any" matcher for flexible flows', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Any random user message here' }],
      });

      expect(response.choices[0].message.content).toBe('This matches any user message!');
    });

    test('should return error for unmatched messages', async () => {
      await expect(
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: 'This system message has no matching pattern' }],
        })
      ).rejects.toThrow();
    });

    test('should support partial conversation matching - first turn', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Start conversation' }],
      });

      expect(response.choices[0].message.content).toBe('The weather is sunny and warm today!');
    });

    test('should support partial conversation matching - second turn', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Start conversation' },
          { role: 'assistant', content: 'Hello! How can I help you?' },
        ],
      });

      expect(response.choices[0].message.content).toBe('The weather is sunny and warm today!');
    });

    test('should support partial conversation matching - full conversation', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Start conversation' },
          { role: 'assistant', content: 'Hello! How can I help you?' },
          { role: 'user', content: 'Tell me about the weather' },
        ],
      });

      expect(response.choices[0].message.content).toBe('The weather is sunny and warm today!');
    });
  });

  describe('Streaming', () => {
    test('should handle streaming responses', async () => {
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
        stream: true,
      });

      const chunks: string[] = [];
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          chunks.push(chunk.choices[0].delta.content);
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBe("Hello! I'm doing well, thank you for asking.");
    });
  });

  describe('Models Endpoint', () => {
    test('should return available models', async () => {
      const models = await openai.models.list();

      expect(models.data).toHaveLength(2);
      expect(models.data.map((m) => m.id)).toContain('gpt-3.5-turbo');
      expect(models.data.map((m) => m.id)).toContain('gpt-4');
    });
  });

  describe('Token Calculation', () => {
    test('should calculate tokens for unsupported model using default tokenizer', async () => {
      const response = await openai.chat.completions.create({
        model: 'custom-unsupported-model',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      });

      expect(response.choices[0].message.content).toBe(
        "Hello! I'm doing well, thank you for asking."
      );
      expect(response.usage).toBeDefined();
      expect(response.usage?.total_tokens).toBeGreaterThan(0);
      expect(response.usage?.prompt_tokens).toBeGreaterThan(0);
      expect(response.usage?.completion_tokens).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should return proper error for missing messages', async () => {
      await expect(
        fetch(`http://localhost:${testPort}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
          }),
        }).then((res) => res.json())
      ).resolves.toMatchObject({
        error: {
          type: 'invalid_request_error',
          message: expect.stringContaining('messages'),
        },
      });
    });

    test('should return proper error for missing model', async () => {
      await expect(
        fetch(`http://localhost:${testPort}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        }).then((res) => res.json())
      ).resolves.toMatchObject({
        error: {
          type: 'invalid_request_error',
          message: expect.stringContaining('model'),
        },
      });
    });
  });
});

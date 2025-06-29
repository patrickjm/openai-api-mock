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
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello, how are you?"
    response:
      id: "chatcmpl-test1"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Hello! I'm doing well, thank you for asking."
          finish_reason: "stop"
      usage:
        prompt_tokens: 15
        completion_tokens: 12
        total_tokens: 27

  - id: "fuzzy-help"
    matcher:
      type: "fuzzy"
      threshold: 0.4
      messages:
        - role: "user"
          content: "I need help with something"
    response:
      id: "chatcmpl-test2"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "I'd be happy to help!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 12
        completion_tokens: 8
        total_tokens: 20

  - id: "regex-code"
    matcher:
      type: "regex"
      messages:
        - role: "user"
          content: ".*code.*python.*"
    response:
      id: "chatcmpl-test3"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-4"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Here's some Python code for you!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 20
        completion_tokens: 10
        total_tokens: 30

  - id: "contains-weather"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "weather"
    response:
      id: "chatcmpl-test4"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "The weather is nice today!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 10
        completion_tokens: 8
        total_tokens: 18

  - id: "inverted-contains"
    matcher:
      type: "contains"
      invert: true
      messages:
        - role: "user"
          content: "SPECIFIC_WORD_TO_AVOID"
        - role: "assistant"
          content: "response"
    response:
      id: "chatcmpl-test5"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "This matches messages that don't contain the specific word!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 15
        completion_tokens: 12
        total_tokens: 27

  - id: "specific-unmatched"
    matcher:
      type: "exact"
      messages:
        - role: "system"
          content: "This exact system message should not be used"
    response:
      id: "chatcmpl-test6"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "This should not match"
          finish_reason: "stop"
      usage:
        prompt_tokens: 15
        completion_tokens: 5
        total_tokens: 20
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
      expect(response.choices[0].message.content).toBe("Hello! I'm doing well, thank you for asking.");
    });
  });

  describe('Message Matching', () => {
    test('should match exact messages', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
      });

      expect(response.choices[0].message.content).toBe("Hello! I'm doing well, thank you for asking.");
      expect(response.usage?.total_tokens).toBe(27);
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

      expect(response.choices[0].message.content).toBe("The weather is nice today!");
    });

    test('should handle inverted contains matching', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Any message without the specific word' },
          { role: 'assistant', content: 'Another message' }
        ],
      });

      expect(response.choices[0].message.content).toBe("This matches messages that don't contain the specific word!");
    });

    test('should not match when inverted matcher would normally match', async () => {
      await expect(
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: "This contains SPECIFIC_WORD_TO_AVOID in it" },
            { role: 'assistant', content: "response" }
          ],
        })
      ).rejects.toThrow();
    });

    test('should return error for unmatched messages', async () => {
      await expect(
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: 'SPECIFIC_WORD_TO_AVOID' },
            { role: 'assistant', content: 'response' }
          ],
        })
      ).rejects.toThrow();
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
      expect(models.data.map(m => m.id)).toContain('gpt-3.5-turbo');
      expect(models.data.map(m => m.id)).toContain('gpt-4');
    });
  });

  describe('Error Handling', () => {
    test('should return proper error for missing messages', async () => {
      await expect(
        fetch(`http://localhost:${testPort}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
          }),
        }).then(res => res.json())
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
            'Authorization': 'Bearer test-api-key-12345',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        }).then(res => res.json())
      ).resolves.toMatchObject({
        error: {
          type: 'invalid_request_error',
          message: expect.stringContaining('model'),
        },
      });
    });
  });
});
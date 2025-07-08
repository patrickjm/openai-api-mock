import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { ConfigLoader, Logger, MockServer } from '../src';

describe('Matcher Scoring System', () => {
  let server: MockServer;
  let openai: OpenAI;
  const testPort = 3003;
  const testConfigPath = path.join(__dirname, 'test-scoring-config.yaml');

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  test('should prioritize more specific matchers over "any" matcher', async () => {
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

  - id: "regex-pattern"
    messages:
      - role: "user"
        content: ".*hello.*"
        matcher: "regex"
      - role: "assistant"
        content: "This is the REGEX hello response"
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

    // Test 1: Exact match should win over 'any'
    const response1 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello, how are you?' }],
    });
    expect(response1.choices[0].message.content).toBe('This is the SPECIFIC greeting response');

    // Test 2: Regex should win over 'any' and 'contains'
    const response2 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Well hello there!' }],
    });
    expect(response2.choices[0].message.content).toBe('This is the REGEX hello response');

    // Test 3: Contains should win over 'any'
    const response3 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(response3.choices[0].message.content).toBe('This is the REGEX hello response'); // Regex also matches

    // Test 4: Only 'any' matches
    const response4 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Something completely different' }],
    });
    expect(response4.choices[0].message.content).toBe('This is the ANY matcher response');
  });

  test('should handle tie-breaking when scores are equal', async () => {
    const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "contains-1"
    messages:
      - role: "user"
        content: "hello"
        matcher: "contains"
      - role: "assistant"
        content: "First contains response"

  - id: "contains-2"
    messages:
      - role: "user"
        content: "hello"
        matcher: "contains"
      - role: "assistant"
        content: "Second contains response"
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

    // When scores are equal, the first one should still win
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'hello world' }],
    });
    expect(response.choices[0].message.content).toBe('First contains response');
  });

  test('should correctly score multi-turn conversations', async () => {
    const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "mixed-matchers"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "First response"
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "Mixed matchers response"

  - id: "specific-conversation"
    messages:
      - role: "user"
        content: "Start"
      - role: "assistant"
        content: "First response"
      - role: "user"
        content: "Continue"
      - role: "assistant"
        content: "Specific conversation response"
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

    // The specific conversation should win due to higher average score
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Start' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Continue' },
      ],
    });
    expect(response.choices[0].message.content).toBe('Specific conversation response');
  });
});

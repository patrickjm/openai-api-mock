---
title: Programmatic Usage
description: Using the OpenAI mock API server programmatically in your code
---

While the CLI interface is great for standalone testing, you can also use the mock server programmatically within your applications and tests. This approach gives you full control over the server lifecycle and configuration.

## Installation

Install the package as a dependency (not just dev dependency if you need it in production):

```bash
npm install openai-mock-api
```

## Basic Usage

### Creating a Mock Server

```typescript
import { createMockServer, MockConfig } from 'openai-mock-api';

const config: MockConfig = {
  apiKey: 'test-api-key',
  port: 3001,
  responses: [
    {
      id: 'greeting',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there! How can I help you today?' },
      ],
    },
  ],
};

const mockServer = await createMockServer({ config });
await mockServer.start();

// Your server is now running on port 3001
console.log(`Mock server running on port ${mockServer.port}`);

// Don't forget to stop it when done
await mockServer.stop();
```

### Using with YAML Configuration

You can also pass YAML configuration as a string:

```typescript
import { createMockServer } from 'openai-mock-api';

const yamlConfig = `
apiKey: "test-api-key"
port: 3001
responses:
  - id: "greeting"
    messages:
      - role: "user"
        content: "Hello"
      - role: "assistant"  
        content: "Hi there! How can I help you today?"
`;

const mockServer = await createMockServer({
  config: yamlConfig,
  verbose: true,
});
```

### Quick Start with `startMockServer`

For convenience, you can create and start a server in one call:

```typescript
import { startMockServer } from 'openai-mock-api';

const mockServer = await startMockServer({
  config: yamlConfig,
  port: 3001,
});

// Server is already running
```

## Testing Patterns

### Jest Integration

```typescript
import { createMockServer, MockConfig } from 'openai-mock-api';
import OpenAI from 'openai';

describe('OpenAI API Integration', () => {
  let mockServer: any;
  let openai: OpenAI;

  beforeAll(async () => {
    const config: MockConfig = {
      apiKey: 'test-key',
      responses: [
        {
          id: 'test-response',
          messages: [
            { role: 'user', content: 'test' },
            { role: 'assistant', content: 'Test response' },
          ],
        },
      ],
    };

    mockServer = await createMockServer({ config, port: 3002 });
    await mockServer.start();

    openai = new OpenAI({
      apiKey: 'test-key',
      baseURL: `http://localhost:${mockServer.port}/v1`,
    });
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  test('should respond to chat completion', async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(response.choices[0].message.content).toBe('Test response');
  });
});
```

### Mocha/Chai Integration

```typescript
import { expect } from 'chai';
import { createMockServer } from 'openai-mock-api';
import OpenAI from 'openai';

describe('OpenAI API Tests', () => {
  let mockServer: any;
  let openai: OpenAI;

  before(async () => {
    mockServer = await createMockServer({
      config: {
        apiKey: 'test-key',
        responses: [
          /* your responses */
        ],
      },
      port: 3003,
    });
    await mockServer.start();

    openai = new OpenAI({
      apiKey: 'test-key',
      baseURL: `http://localhost:${mockServer.port}/v1`,
    });
  });

  after(async () => {
    await mockServer.stop();
  });

  it('should handle chat completions', async () => {
    // Your test code here
  });
});
```

## Advanced Configuration

### Custom Logger

```typescript
import { createMockServer, Logger } from 'openai-mock-api';

const mockServer = await createMockServer({
  config: yourConfig,
  verbose: true,
  logFile: './mock-server.log',
});
```

### Multiple Servers

You can run multiple mock servers on different ports:

```typescript
const server1 = await createMockServer({
  config: config1,
  port: 3001,
});
const server2 = await createMockServer({
  config: config2,
  port: 3002,
});

await Promise.all([server1.start(), server2.start()]);

// Later...
await Promise.all([server1.stop(), server2.stop()]);
```

### Dynamic Configuration

```typescript
import { MockConfig } from 'openai-mock-api';

function createDynamicConfig(): MockConfig {
  return {
    apiKey: process.env.TEST_API_KEY || 'test-key',
    port: parseInt(process.env.MOCK_PORT || '3000'),
    responses: [
      // Generate responses based on test requirements
    ],
  };
}

const mockServer = await createMockServer({
  config: createDynamicConfig(),
});
```

## Error Handling

```typescript
try {
  const mockServer = await createMockServer({ config: invalidConfig });
  await mockServer.start();
} catch (error) {
  if (error.message.includes('EADDRINUSE')) {
    console.error('Port is already in use');
  } else if (error.message.includes('Failed to parse YAML')) {
    console.error('Invalid YAML configuration');
  } else {
    console.error('Server startup failed:', error.message);
  }
}
```

## API Reference

### `createMockServer(options)`

Creates a mock server instance without starting it.

**Parameters:**

- `options.config`: MockConfig object or YAML string
- `options.port`: Optional port override
- `options.verbose`: Enable verbose logging
- `options.logFile`: Optional log file path

**Returns:** Promise<MockServerInstance>

### `startMockServer(options)`

Creates and immediately starts a mock server.

**Parameters:** Same as `createMockServer`

**Returns:** Promise<MockServerInstance>

### MockServerInstance

**Properties:**

- `server`: The underlying MockServer instance
- `port`: The port the server is running on

**Methods:**

- `start()`: Start the server
- `stop()`: Stop the server

## Best Practices

1. **Always stop servers in cleanup**: Use `afterAll`, `after`, or similar hooks to ensure servers are stopped
2. **Use unique ports**: Avoid port conflicts when running multiple tests
3. **Handle async operations**: Always await server start/stop operations
4. **Validate configuration**: The server will validate your config and throw helpful error messages
5. **Use environment variables**: Make ports and configuration configurable for different environments

## TypeScript Support

The package includes full TypeScript definitions. Import types as needed:

```typescript
import {
  MockConfig,
  MockResponse,
  CreateMockServerOptions,
  MockServerInstance,
} from 'openai-mock-api';
```

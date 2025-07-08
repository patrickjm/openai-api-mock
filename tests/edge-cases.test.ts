import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { ConfigLoader, Logger, MockServer } from '../src';
import axios from 'axios';

describe('Edge Cases and Tool Validation', () => {
  // Increase timeout for these tests to handle server startup/cleanup delays
  jest.setTimeout(10000);
  let server: MockServer;
  let openai: OpenAI;
  let testPort = 3004;
  const testConfigPath = path.join(__dirname, 'test-edge-cases-config.yaml');

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
        // Add a small delay to ensure the server is fully stopped
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('Error stopping server:', error);
      } finally {
        server = null as any;
      }
    }
    if (fs.existsSync(testConfigPath)) {
      try {
        fs.unlinkSync(testConfigPath);
      } catch (error) {
        console.warn('Error removing config file:', error);
      }
    }
  });

  describe('Tool Call Validation', () => {
    beforeEach(async () => {
      testPort = 3010;
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "tool-response"
    messages:
      - role: "user"
        content: "What's the weather?"
      - role: "assistant"
        content: "Let me check the weather for you."
        tool_calls:
          - id: "call_123"
            type: "function"
            function:
              name: "get_weather"
              arguments: '{"location": "San Francisco"}'
`;
      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);

      // Add a small delay before starting to avoid port conflicts
      await new Promise((resolve) => setTimeout(resolve, 50));
      await server.start(testPort);

      // Ensure server is fully started before creating OpenAI client
      await new Promise((resolve) => setTimeout(resolve, 50));
      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });
    });

    test('should accept valid tool calls', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: "What's the weather?" }],
      });

      expect(response.choices[0].message.tool_calls).toBeDefined();
      expect(response.choices[0].message.tool_calls![0]).toEqual({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: '{"location": "San Francisco"}',
        },
      });
    });

    test('should reject malformed tool calls - missing id', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'assistant',
                tool_calls: [
                  {
                    type: 'function',
                    function: {
                      name: 'test',
                      arguments: '{}',
                    },
                  },
                ],
              },
            ],
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('id is required'),
            },
          },
        },
      });
    });

    test('should reject malformed tool calls - invalid type', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'invalid_type',
                    function: {
                      name: 'test',
                      arguments: '{}',
                    },
                  },
                ],
              },
            ],
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining("type must be 'function'"),
            },
          },
        },
      });
    });

    test('should reject malformed tool calls - invalid JSON arguments', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'test',
                      arguments: 'invalid json',
                    },
                  },
                ],
              },
            ],
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('must be a valid JSON string'),
            },
          },
        },
      });
    });

    test('should validate tool messages require tool_call_id', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'tool',
                content: 'Tool response without tool_call_id',
              },
            ],
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('tool_call_id is required for tool messages'),
            },
          },
        },
      });
    });
  });

  describe('Invalid Regex Patterns', () => {
    test('should handle invalid regex patterns gracefully', async () => {
      testPort = 3020;
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "invalid-regex"
    messages:
      - role: "user"
        content: "[invalid(regex"
        matcher: "regex"
      - role: "assistant"
        content: "This has invalid regex"
`;
      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);

      // Add a small delay before starting to avoid port conflicts
      await new Promise((resolve) => setTimeout(resolve, 50));
      await server.start(testPort);

      // Ensure server is fully started before creating OpenAI client
      await new Promise((resolve) => setTimeout(resolve, 50));
      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });

      // Should not match the invalid regex and fall through to no match
      try {
        await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: '[invalid(regex' }],
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('No matching response found');
      }
    });
  });

  describe('Concurrent Requests', () => {
    beforeEach(async () => {
      testPort = 3030;
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "concurrent-1"
    messages:
      - role: "user"
        content: "Request 1"
      - role: "assistant"
        content: "Response 1"
  - id: "concurrent-2"
    messages:
      - role: "user"
        content: "Request 2"
      - role: "assistant"
        content: "Response 2"
  - id: "concurrent-3"
    messages:
      - role: "user"
        content: "Request 3"
      - role: "assistant"
        content: "Response 3"
`;
      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);

      // Add a small delay before starting to avoid port conflicts
      await new Promise((resolve) => setTimeout(resolve, 50));
      await server.start(testPort);

      // Ensure server is fully started before creating OpenAI client
      await new Promise((resolve) => setTimeout(resolve, 50));
      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });
    });

    test('should handle concurrent requests correctly', async () => {
      const requests = [
        openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Request 1' }],
        }),
        openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Request 2' }],
        }),
        openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Request 3' }],
        }),
      ];

      const responses = await Promise.all(requests);

      expect(responses[0].choices[0].message.content).toBe('Response 1');
      expect(responses[1].choices[0].message.content).toBe('Response 2');
      expect(responses[2].choices[0].message.content).toBe('Response 3');
    });
  });

  describe('Request Validation Edge Cases', () => {
    beforeEach(async () => {
      testPort = 3040;
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "any"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "Default response"
`;
      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);
      await server.start(testPort);
    });

    test('should validate temperature bounds', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 3.0, // Invalid, should be 0-2
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('temperature must be a number between 0 and 2'),
            },
          },
        },
      });
    });

    test('should validate top_p bounds', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Hello' }],
            top_p: 1.5, // Invalid, should be 0-1
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('top_p must be a number between 0 and 1'),
            },
          },
        },
      });
    });

    test('should validate n is positive integer', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Hello' }],
            n: 1.5, // Invalid, should be integer
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('n must be a positive integer'),
            },
          },
        },
      });
    });

    test('should validate stop parameter', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Hello' }],
            stop: [123, 456], // Invalid, should be strings
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('stop array must contain only strings'),
            },
          },
        },
      });
    });

    test('should handle invalid JSON in request body', async () => {
      await expect(
        axios.post(`http://localhost:${testPort}/v1/chat/completions`, 'invalid json', {
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              type: 'invalid_request_error',
            },
          },
        },
      });
    });

    test('should validate message role values', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [{ role: 'invalid_role', content: 'Hello' }],
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining(
                'role must be one of: system, user, assistant, tool'
              ),
            },
          },
        },
      });
    });

    test('should validate assistant messages have content or tool_calls', async () => {
      await expect(
        axios.post(
          `http://localhost:${testPort}/v1/chat/completions`,
          {
            model: 'gpt-4',
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant' }, // Missing both content and tool_calls
            ],
          },
          {
            headers: {
              Authorization: 'Bearer test-api-key',
              'Content-Type': 'application/json',
            },
          }
        )
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              message: expect.stringContaining('must have either content or tool_calls'),
            },
          },
        },
      });
    });
  });

  describe('Streaming Edge Cases', () => {
    beforeEach(async () => {
      testPort = 3050;
      const testConfig = `
apiKey: "test-api-key"
port: ${testPort}
responses:
  - id: "stream-test"
    messages:
      - role: "user"
        content: "Stream this"
      - role: "assistant"
        content: "This is a streaming response"
        tool_calls:
          - id: "call_stream"
            type: "function"
            function:
              name: "test_function"
              arguments: '{"test": true}'
`;
      fs.writeFileSync(testConfigPath, testConfig);
      const logger = new Logger();
      const configLoader = new ConfigLoader(logger);
      const config = await configLoader.load(testConfigPath);
      server = new MockServer(config, logger);

      // Add a small delay before starting to avoid port conflicts
      await new Promise((resolve) => setTimeout(resolve, 50));
      await server.start(testPort);

      // Ensure server is fully started before creating OpenAI client
      await new Promise((resolve) => setTimeout(resolve, 50));
      openai = new OpenAI({
        apiKey: 'test-api-key',
        baseURL: `http://localhost:${testPort}/v1`,
      });
    });

    test('should stream tool calls correctly', async () => {
      const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Stream this' }],
        stream: true,
      });

      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Check that we have both tool calls and content in the stream
      const hasToolCall = chunks.some((c) => c.choices[0]?.delta?.tool_calls);
      const hasContent = chunks.some((c) => c.choices[0]?.delta?.content);

      expect(hasToolCall).toBe(true);
      expect(hasContent).toBe(true);
    });
  });
});

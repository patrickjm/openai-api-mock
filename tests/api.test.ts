import { createMockServer, startMockServer } from '../src/api';
import { MockConfig } from '../src/types';
import OpenAI from 'openai';

describe('Programmatic API', () => {
  describe('createMockServer', () => {
    it('should create a mock server with object config', async () => {
      const config: MockConfig = {
        apiKey: 'test-key',
        port: 4000,
        responses: [
          {
            id: 'test-response',
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Hi there!' },
            ],
          },
        ],
      };

      const instance = await createMockServer({ config });
      expect(instance.server).toBeDefined();
      expect(instance.port).toBe(4000);
      expect(instance.start).toBeInstanceOf(Function);
      expect(instance.stop).toBeInstanceOf(Function);
    });

    it('should create a mock server with YAML string config', async () => {
      const yamlConfig = `
apiKey: test-key
port: 4001
responses:
  - id: test-response
    messages:
      - role: user
        content: Hello
      - role: assistant
        content: Hi there!
`;

      const instance = await createMockServer({ config: yamlConfig });
      expect(instance.server).toBeDefined();
      expect(instance.port).toBe(4001);
    });

    it('should override port from options', async () => {
      const config: MockConfig = {
        apiKey: 'test-key',
        port: 4000,
        responses: [
          {
            id: 'test-response',
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Hi there!' },
            ],
          },
        ],
      };

      const instance = await createMockServer({ config, port: 5000 });
      expect(instance.port).toBe(5000);
    });

    it('should throw on invalid YAML', async () => {
      const invalidYaml = `
apiKey: test-key
invalid yaml [[[
`;

      await expect(createMockServer({ config: invalidYaml })).rejects.toThrow(
        'Failed to parse YAML configuration'
      );
    });

    it('should throw on invalid config', async () => {
      const invalidConfig: any = {
        // Missing apiKey
        responses: [],
      };

      await expect(createMockServer({ config: invalidConfig })).rejects.toThrow(
        'Configuration must include an apiKey'
      );
    });
  });

  describe('startMockServer', () => {
    it('should create and start a mock server', async () => {
      const config: MockConfig = {
        apiKey: 'test-key-123',
        port: 4002,
        responses: [
          {
            id: 'greeting',
            messages: [
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Hello from mock!' },
            ],
          },
        ],
      };

      const instance = await startMockServer({ config });

      try {
        // Test that the server is running
        const openai = new OpenAI({
          apiKey: 'test-key-123',
          baseURL: 'http://localhost:4002/v1',
        });

        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        });

        expect(response.choices[0].message.content).toBe('Hello from mock!');
      } finally {
        await instance.stop();
      }
    });

    it('should support verbose logging', async () => {
      const config: MockConfig = {
        apiKey: 'test-key',
        port: 4003,
        responses: [
          {
            id: 'test',
            messages: [
              { role: 'user', content: 'Test' },
              { role: 'assistant', content: 'Test response' },
            ],
          },
        ],
      };

      // Just test that verbose option is accepted without errors
      const instance = await startMockServer({ config, verbose: true });

      try {
        expect(instance.server).toBeDefined();
        expect(instance.port).toBe(4003);
      } finally {
        await instance.stop();
      }
    });
  });

  describe('Integration with multiple servers', () => {
    it('should support running multiple mock servers on different ports', async () => {
      const config1: MockConfig = {
        apiKey: 'key1',
        responses: [
          {
            id: 'server1',
            messages: [
              { role: 'user', content: 'ping' },
              { role: 'assistant', content: 'pong from server 1' },
            ],
          },
        ],
      };

      const config2: MockConfig = {
        apiKey: 'key2',
        responses: [
          {
            id: 'server2',
            messages: [
              { role: 'user', content: 'ping' },
              { role: 'assistant', content: 'pong from server 2' },
            ],
          },
        ],
      };

      const server1 = await startMockServer({ config: config1, port: 4004 });
      const server2 = await startMockServer({ config: config2, port: 4005 });

      try {
        // Test server 1
        const client1 = new OpenAI({
          apiKey: 'key1',
          baseURL: 'http://localhost:4004/v1',
        });

        const response1 = await client1.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'ping' }],
        });

        expect(response1.choices[0].message.content).toBe('pong from server 1');

        // Test server 2
        const client2 = new OpenAI({
          apiKey: 'key2',
          baseURL: 'http://localhost:4005/v1',
        });

        const response2 = await client2.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'ping' }],
        });

        expect(response2.choices[0].message.content).toBe('pong from server 2');
      } finally {
        await server1.stop();
        await server2.stop();
      }
    });
  });
});

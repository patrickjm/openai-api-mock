---
title: Integration Examples
description: Real-world examples of integrating OpenAI Mock API into various testing scenarios
---

# Integration Examples

Learn how to integrate OpenAI Mock API into different types of applications and testing frameworks.

## Node.js Application Testing

### Express.js API Server

```typescript
// src/chat-api.ts
import express from 'express';
import OpenAI from 'openai';

export function createChatAPI(openai: OpenAI) {
  const app = express();
  app.use(express.json());

  app.post('/chat', async (req, res) => {
    try {
      const { message } = req.body;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
      });

      res.json({
        response: completion.choices[0].message.content,
        usage: completion.usage,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  });

  return app;
}
```

### Testing the API

```typescript
// tests/chat-api.test.ts
import request from 'supertest';
import OpenAI from 'openai';
import { createChatAPI } from '../src/chat-api';

describe('Chat API', () => {
  let app: Express.Application;

  beforeAll(() => {
    const mockOpenAI = new OpenAI({
      apiKey: 'test-key',
      baseURL: 'http://localhost:3000/v1',
    });
    app = createChatAPI(mockOpenAI);
  });

  test('should return AI response', async () => {
    const response = await request(app).post('/chat').send({ message: 'Hello' }).expect(200);

    expect(response.body.response).toBe('Hello! How can I help you?');
    expect(response.body.usage).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    const response = await request(app)
      .post('/chat')
      .send({ message: 'unmatched request' })
      .expect(500);

    expect(response.body.error).toBe('Failed to get AI response');
  });
});
```

### Mock Configuration

```yaml
# test-config.yaml
apiKey: 'test-key'
responses:
  - id: 'hello-response'
    messages:
      - role: 'user'
        content: 'Hello'
      - role: 'assistant'
        content: 'Hello! How can I help you?'
```

## React Application Testing

### Chat Component

```tsx
// src/components/ChatComponent.tsx
import React, { useState } from 'react';
import OpenAI from 'openai';

interface ChatComponentProps {
  openai: OpenAI;
}

export function ChatComponent({ openai }: ChatComponentProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [...messages, userMessage].map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const assistantMessage = {
        role: 'assistant',
        content: completion.choices[0].message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="chat-component">
      <div data-testid="messages">
        {messages.map((msg, idx) => (
          <div key={idx} data-testid={`message-${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {loading && <div data-testid="loading">Thinking...</div>}

      <div>
        <input
          data-testid="message-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button data-testid="send-button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
```

### Testing with React Testing Library

```tsx
// tests/ChatComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OpenAI from 'openai';
import { ChatComponent } from '../src/components/ChatComponent';

describe('ChatComponent', () => {
  let mockOpenAI: OpenAI;

  beforeAll(() => {
    mockOpenAI = new OpenAI({
      apiKey: 'test-key',
      baseURL: 'http://localhost:3000/v1',
    });
  });

  test('should send and receive messages', async () => {
    render(<ChatComponent openai={mockOpenAI} />);

    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    // Send a message
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    // Should show user message immediately
    expect(screen.getByTestId('message-user')).toHaveTextContent('user: Hello');

    // Should show loading indicator
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Should receive assistant response
    await waitFor(() => {
      expect(screen.getByTestId('message-assistant')).toHaveTextContent(
        'assistant: Hello! How can I help you?'
      );
    });

    // Loading should be gone
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  test('should handle conversation context', async () => {
    render(<ChatComponent openai={mockOpenAI} />);

    const input = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    // Send first message
    fireEvent.change(input, { target: { value: 'My name is John' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
    });

    // Send follow-up message
    fireEvent.change(input, { target: { value: 'What is my name?' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      const assistantMessages = screen.getAllByTestId('message-assistant');
      expect(assistantMessages).toHaveLength(2);
      expect(assistantMessages[1]).toHaveTextContent('Your name is John');
    });
  });
});
```

### Multi-turn Conversation Configuration

```yaml
# react-test-config.yaml
apiKey: 'test-key'
responses:
  - id: 'hello-response'
    messages:
      - role: 'user'
        content: 'Hello'
      - role: 'assistant'
        content: 'Hello! How can I help you?'

  - id: 'name-introduction'
    messages:
      - role: 'user'
        content: 'My name is'
        matcher: 'contains'
      - role: 'assistant'
        content: "Nice to meet you! I'll remember your name."

  - id: 'name-recall'
    messages:
      - role: 'user'
        content: 'My name is John'
      - role: 'assistant'
        content: "Nice to meet you! I'll remember your name."
      - role: 'user'
        content: 'What is my name?'
      - role: 'assistant'
        content: 'Your name is John.'
```

## Python Application Testing

### FastAPI Application

```python
# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openai
import os

app = FastAPI()

# Configure OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY", "test-key")
openai.api_base = os.getenv("OPENAI_API_BASE", "http://localhost:3000/v1")

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    usage: dict

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": request.message}]
        )

        return ChatResponse(
            response=completion.choices[0].message.content,
            usage=completion.usage
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI service error")
```

### Testing with pytest

```python
# test_app.py
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_chat_endpoint():
    response = client.post("/chat", json={"message": "Hello"})
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "usage" in data
    assert data["response"] == "Hello! How can I help you?"

def test_chat_error_handling():
    response = client.post("/chat", json={"message": "unmatched request"})
    assert response.status_code == 500
    assert "AI service error" in response.json()["detail"]

@pytest.fixture(scope="session", autouse=True)
def setup_environment():
    import subprocess
    import time

    # Start mock server
    process = subprocess.Popen([
        "npx", "openai-mock-api",
        "--config", "python-test-config.yaml"
    ])
    time.sleep(2)  # Wait for server to start

    yield

    # Cleanup
    process.terminate()
```

## Jest Integration Testing

### Programmatic Setup (Recommended)

```typescript
// tests/setup.ts
import { createMockServer, MockConfig } from 'openai-mock-api';

let mockServerInstance: any;

export async function setupMockServer(): Promise<void> {
  const config: MockConfig = {
    apiKey: 'test-key',
    responses: [
      {
        id: 'hello-response',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hello! How can I help you?' }
        ]
      }
    ]
  };

  mockServerInstance = await createMockServer({ 
    config, 
    port: 3000,
    verbose: false 
  });
  await mockServerInstance.start();
}

export async function teardownMockServer(): Promise<void> {
  if (mockServerInstance) {
    await mockServerInstance.stop();
  }
}
```

### CLI-based Setup (Alternative)

```typescript
// tests/setup-cli.ts
import { ChildProcess, spawn } from 'child_process';

let mockServer: ChildProcess;

export async function setupMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    mockServer = spawn('npx', [
      'openai-mock-api',
      '--config',
      'test-config.yaml',
      '--port',
      '3000',
    ]);

    let output = '';
    mockServer.stdout?.on('data', (data) => {
      output += data.toString();
      if (output.includes('started on port 3000')) {
        resolve();
      }
    });

    mockServer.stderr?.on('data', (data) => {
      console.error('Mock server error:', data.toString());
    });

    mockServer.on('error', reject);

    // Timeout after 10 seconds
    setTimeout(() => reject(new Error('Mock server start timeout')), 10000);
  });
}

export async function teardownMockServer(): Promise<void> {
  if (mockServer) {
    mockServer.kill();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/setup.ts',
  globalTeardown: '<rootDir>/tests/teardown.ts',
  testTimeout: 15000,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
};
```

```typescript
// tests/jest.setup.ts
import OpenAI from 'openai';

// Make OpenAI client available globally in tests
declare global {
  var openai: OpenAI;
}

global.openai = new OpenAI({
  apiKey: 'test-key',
  baseURL: 'http://localhost:3000/v1',
});
```

### Test Example

```typescript
// tests/integration.test.ts
describe('Integration Tests', () => {
  test('should work with global OpenAI client', async () => {
    const response = await global.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(response.choices[0].message.content).toBe('Hello! How can I help you?');
  });
});
```

## Docker Integration

### Dockerfile for Testing

```dockerfile
# Dockerfile.test
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and test files
COPY src/ ./src/
COPY tests/ ./tests/
COPY test-config.yaml ./

# Install openai-mock-api globally
RUN npm install -g openai-mock-api

# Run tests
CMD ["sh", "-c", "openai-mock-api --config test-config.yaml & sleep 2 && npm test"]
```

### Docker Compose for Complex Testing

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  openai-mock:
    image: node:18-alpine
    command: sh -c "npm install -g openai-mock-api && openai-mock-api --config /config/test-config.yaml"
    ports:
      - '3000:3000'
    volumes:
      - ./test-config.yaml:/config/test-config.yaml
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/health']
      interval: 2s
      timeout: 1s
      retries: 5

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      openai-mock:
        condition: service_healthy
    environment:
      - OPENAI_BASE_URL=http://openai-mock:3000/v1
      - OPENAI_API_KEY=test-key
    command: npm test
```

## CI/CD Integration Examples

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      openai-mock:
        image: node:18
        ports:
          - 3000:3000
        options: >-
          --health-cmd "wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        env:
          CONFIG_PATH: /github/workspace/test-config.yaml

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Start OpenAI Mock
        run: |
          npm install -g openai-mock-api
          openai-mock-api --config test-config.yaml &
          sleep 3

      - name: Run tests
        run: npm test
        env:
          OPENAI_BASE_URL: http://localhost:3000/v1
          OPENAI_API_KEY: test-key
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

test:
  stage: test
  image: node:18
  services:
    - name: node:18
      alias: openai-mock
      command:
        - sh
        - -c
        - 'npm install -g openai-mock-api && openai-mock-api --config test-config.yaml'

  variables:
    OPENAI_BASE_URL: 'http://openai-mock:3000/v1'
    OPENAI_API_KEY: 'test-key'

  before_script:
    - npm install
    - sleep 5 # Wait for mock service to start

  script:
    - npm test

  artifacts:
    reports:
      junit: junit.xml
```

These examples demonstrate how to integrate OpenAI Mock API into various testing scenarios, from simple unit tests to complex CI/CD pipelines. The key is to start the mock server before your tests run and configure your OpenAI client to point to the mock server's URL.

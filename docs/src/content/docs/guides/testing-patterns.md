---
title: Testing Patterns
description: Common patterns and best practices for testing with OpenAI Mock API
---

# Testing Patterns

Learn effective patterns for testing LLM applications using OpenAI Mock API.

## Unit Testing Patterns

### Testing Individual Components

```typescript
// Example: Testing a chat service
import { ChatService } from '../src/chat-service';
import OpenAI from 'openai';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockOpenAI: OpenAI;

  beforeAll(() => {
    // Point to mock API
    mockOpenAI = new OpenAI({
      apiKey: 'test-key',
      baseURL: 'http://localhost:3000/v1',
    });
    chatService = new ChatService(mockOpenAI);
  });

  test('should handle greeting correctly', async () => {
    const response = await chatService.processMessage('Hello');
    expect(response).toBe('Hello! How can I help you?');
  });

  test('should handle help requests', async () => {
    const response = await chatService.processMessage('I need help');
    expect(response).toContain('assistance');
  });
});
```

### Corresponding Mock Configuration

```yaml
apiKey: 'test-key'
responses:
  - id: 'unit-test-greeting'
    messages:
      - role: 'user'
        content: 'Hello'
      - role: 'assistant'
        content: 'Hello! How can I help you?'

  - id: 'unit-test-help'
    messages:
      - role: 'user'
        content: 'help'
        matcher: 'contains'
      - role: 'assistant'
        content: "I'd be happy to provide assistance!"
```

## Integration Testing Patterns

### End-to-End Conversation Testing

```typescript
describe('Full Conversation Flow', () => {
  test('should handle multi-turn booking conversation', async () => {
    const messages = [];

    // Start conversation
    messages.push({ role: 'user', content: 'I want to book a table' });
    let response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [...messages],
    });

    expect(response.choices[0].message.content).toContain('How many people');
    messages.push(response.choices[0].message);

    // Continue conversation
    messages.push({ role: 'user', content: '4 people' });
    response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [...messages],
    });

    expect(response.choices[0].message.content).toContain('What time');
  });
});
```

### Corresponding Multi-Turn Configuration

```yaml
responses:
  # First turn - initial booking request
  - id: 'booking-start'
    messages:
      - role: 'user'
        content: 'book a table'
        matcher: 'contains'
      - role: 'assistant'
        content: "I'd be happy to help you book a table! How many people will be dining?"

  # Second turn - number of people provided
  - id: 'booking-people'
    messages:
      - role: 'user'
        content: 'I want to book a table'
      - role: 'assistant'
        content: "I'd be happy to help you book a table! How many people will be dining?"
      - role: 'user'
        content: '4 people'
      - role: 'assistant'
        content: 'Perfect! For 4 people. What time would you prefer?'
```

## Error Handling Patterns

### Testing Error Conditions

```typescript
describe('Error Handling', () => {
  test('should handle unrecognized requests gracefully', async () => {
    await expect(
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'xyzabc123undefined' }],
      })
    ).rejects.toThrow();
  });

  test('should handle content filter scenarios', async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'inappropriate request' }],
    });

    expect(response.choices[0].finish_reason).toBe('content_filter');
  });
});
```

### Error Response Configuration

```yaml
responses:
  # Content filter simulation
  - id: 'content-filter'
    messages:
      - role: 'user'
        content: 'inappropriate'
        matcher: 'contains'
      - role: 'assistant'
        content: "I can't help with that request."

  # No specific response configured - will return 400 error
```

## Boundary Testing Patterns

### Testing Edge Cases

```typescript
describe('Boundary Conditions', () => {
  test('should handle empty messages', async () => {
    await expect(
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: '' }],
      })
    ).rejects.toThrow();
  });

  test('should handle very long messages', async () => {
    const longMessage = 'a'.repeat(1000);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: longMessage }],
    });

    expect(response.choices[0].message.content).toBeDefined();
  });
});
```

### Boundary Configuration

```yaml
responses:
  # Handle long messages
  - id: 'long-message'
    messages:
      - role: 'user'
        content: 'a{500,}' # 500 or more 'a' characters
        matcher: 'regex'
      - role: 'assistant'
        content: "That's quite a long message!"
```

## Performance Testing Patterns

### Testing Response Times

```typescript
describe('Performance', () => {
  test('should respond quickly', async () => {
    const start = Date.now();

    await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Quick test' }],
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should be very fast with mock
  });

  test('should handle concurrent requests', async () => {
    const requests = Array(10)
      .fill(0)
      .map(() =>
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Concurrent test' }],
        })
      );

    const responses = await Promise.all(requests);
    expect(responses).toHaveLength(10);
    responses.forEach((response) => {
      expect(response.choices[0].message.content).toBeDefined();
    });
  });
});
```

## Test Organization Patterns

### Test Suite Structure

```
tests/
├── unit/
│   ├── chat-service.test.ts
│   ├── message-parser.test.ts
│   └── response-formatter.test.ts
├── integration/
│   ├── conversation-flow.test.ts
│   ├── error-handling.test.ts
│   └── streaming.test.ts
├── e2e/
│   └── full-application.test.ts
└── config/
    ├── unit-test.yaml
    ├── integration-test.yaml
    └── e2e-test.yaml
```

### Environment-Specific Configuration

```yaml
# unit-test.yaml - Simple, fast responses
apiKey: 'unit-test-key'
responses:
  - id: 'simple-response'
    messages:
      - role: 'user'
        content: 'test'
      - role: 'assistant'
        content: 'OK'
```

```yaml
# integration-test.yaml - Realistic, complex responses
apiKey: 'integration-test-key'
responses:
  - id: 'realistic-response'
    messages:
      - role: 'user'
        content: 'I need help with my account'
        matcher: 'fuzzy'
        threshold: 0.8
      - role: 'assistant'
        content: |
          I'd be happy to help you with your account! I can assist with:

          1. Password reset
          2. Profile updates
          3. Subscription management
          4. Billing questions

          What specific issue are you experiencing?
```

## CI/CD Integration Patterns

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Start mock API
        run: |
          npx openai-mock-api --config test-config.yaml &
          sleep 2  # Wait for server to start

      - name: Run tests
        run: npm test

      - name: Stop mock API
        run: pkill -f openai-mock-api
```

### Docker Compose for Integration Tests

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  openai-mock:
    build: .
    ports:
      - '3000:3000'
    volumes:
      - ./test-config.yaml:/app/config.yaml
    command: ['openai-mock-api', '--config', '/app/config.yaml']

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - openai-mock
    environment:
      - OPENAI_BASE_URL=http://openai-mock:3000/v1
      - OPENAI_API_KEY=test-key
    command: ['npm', 'test']
```

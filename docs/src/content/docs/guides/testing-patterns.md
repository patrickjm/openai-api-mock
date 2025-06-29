---
title: Testing Patterns
description: Common patterns and best practices for testing with OpenAI API Mock
---

# Testing Patterns

Learn effective patterns for testing LLM applications using OpenAI API Mock.

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
apiKey: "test-key"
responses:
  - id: "unit-test-greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello"
    response:
      id: "chatcmpl-test1"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Hello! How can I help you?"
          finish_reason: "stop"
      usage:
        prompt_tokens: 2
        completion_tokens: 7
        total_tokens: 9

  - id: "unit-test-help"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "help"
    response:
      id: "chatcmpl-test2"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "I'd be happy to provide assistance!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 5
        completion_tokens: 8
        total_tokens: 13
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
  - id: "booking-start"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "book a table"
    response:
      id: "chatcmpl-booking1"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "I'd be happy to help you book a table! How many people will be dining?"
          finish_reason: "stop"
      usage:
        prompt_tokens: 8
        completion_tokens: 18
        total_tokens: 26

  # Second turn - number of people provided
  - id: "booking-people"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "I want to book a table"
        - role: "assistant"
          content: "I'd be happy to help you book a table! How many people will be dining?"
        - role: "user"
          content: "4 people"
    response:
      id: "chatcmpl-booking2"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Perfect! For 4 people. What time would you prefer?"
          finish_reason: "stop"
      usage:
        prompt_tokens: 25
        completion_tokens: 12
        total_tokens: 37
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
  - id: "content-filter"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "inappropriate"
    response:
      id: "chatcmpl-filtered"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "I can't help with that request."
          finish_reason: "content_filter"
      usage:
        prompt_tokens: 8
        completion_tokens: 8
        total_tokens: 16

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
  - id: "long-message"
    matcher:
      type: "regex"
      messages:
        - role: "user"
          content: "a{500,}"  # 500 or more 'a' characters
    response:
      id: "chatcmpl-long"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "That's quite a long message!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 250  # Approximate for 1000 chars
        completion_tokens: 8
        total_tokens: 258
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
    const requests = Array(10).fill(0).map(() =>
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Concurrent test' }],
      })
    );
    
    const responses = await Promise.all(requests);
    expect(responses).toHaveLength(10);
    responses.forEach(response => {
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
apiKey: "unit-test-key"
responses:
  - id: "simple-response"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "test"
    response:
      id: "chatcmpl-unit"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "OK"
          finish_reason: "stop"
      usage:
        prompt_tokens: 1
        completion_tokens: 1
        total_tokens: 2
```

```yaml
# integration-test.yaml - Realistic, complex responses
apiKey: "integration-test-key"
responses:
  - id: "realistic-response"
    matcher:
      type: "fuzzy"
      threshold: 0.8
      messages:
        - role: "user"
          content: "I need help with my account"
    response:
      id: "chatcmpl-integration"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: |
              I'd be happy to help you with your account! I can assist with:
              
              1. Password reset
              2. Profile updates
              3. Subscription management
              4. Billing questions
              
              What specific issue are you experiencing?
          finish_reason: "stop"
      usage:
        prompt_tokens: 15
        completion_tokens: 45
        total_tokens: 60
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
          npx openai-api-mock --config test-config.yaml &
          sleep 2  # Wait for server to start
        
      - name: Run tests
        run: npm test
        
      - name: Stop mock API
        run: pkill -f openai-api-mock
```

### Docker Compose for Integration Tests

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  openai-mock:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./test-config.yaml:/app/config.yaml
    command: ["openai-api-mock", "--config", "/app/config.yaml"]
    
  test-runner:
    build: 
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - openai-mock
    environment:
      - OPENAI_BASE_URL=http://openai-mock:3000/v1
      - OPENAI_API_KEY=test-key
    command: ["npm", "test"]
```
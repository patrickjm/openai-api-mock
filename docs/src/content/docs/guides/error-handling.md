---
title: Error Handling
description: Understanding and testing error conditions with OpenAI API Mock
---

# Error Handling

OpenAI API Mock provides comprehensive error handling that matches the OpenAI API's error responses, allowing you to test error conditions in your applications.

## Types of Errors

### 1. Authentication Errors (401)

**Cause**: Invalid or missing API key

```typescript
// This will trigger a 401 error
const openai = new OpenAI({
  apiKey: 'wrong-key',
  baseURL: 'http://localhost:3000/v1',
});

try {
  await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello' }],
  });
} catch (error) {
  console.log(error.status); // 401
  console.log(error.message); // Unauthorized
}
```

**Error Response Format**:
```json
{
  "error": {
    "message": "Unauthorized",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
```

### 2. Bad Request Errors (400)

**Cause**: Invalid request format or no matching response found

```typescript
// Missing required fields
try {
  await fetch('http://localhost:3000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-key',
    },
    body: JSON.stringify({
      // Missing required 'model' field
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  });
} catch (error) {
  // Will receive 400 error
}
```

**Error Response Format**:
```json
{
  "error": {
    "message": "Missing required field: model",
    "type": "invalid_request_error",
    "param": "model"
  }
}
```

### 3. Not Found Errors (404)

**Cause**: Unsupported endpoint

```typescript
try {
  await fetch('http://localhost:3000/v1/unsupported-endpoint', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer test-key' },
  });
} catch (error) {
  // Will receive 404 error
}
```

### 4. No Match Errors (400)

**Cause**: No response configuration matches the request

```yaml
# If your config only has this response:
responses:
  - id: "greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello"
    response:
      # ... response config
```

```typescript
// This will trigger a "no match" error
try {
  await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Goodbye' }], // No match for "Goodbye"
  });
} catch (error) {
  console.log(error.status); // 400
  console.log(error.message); // No matching response found
}
```

## Testing Error Scenarios

### Testing Authentication Failures

```typescript
describe('Authentication', () => {
  test('should reject invalid API key', async () => {
    const invalidClient = new OpenAI({
      apiKey: 'invalid-key',
      baseURL: 'http://localhost:3000/v1',
    });

    await expect(
      invalidClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toMatchObject({
      status: 401,
      error: {
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    });
  });

  test('should reject missing API key', async () => {
    await expect(
      fetch('http://localhost:3000/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No Authorization header
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      })
    ).resolves.toHaveProperty('status', 401);
  });
});
```

### Testing Request Validation

```typescript
describe('Request Validation', () => {
  test('should reject missing model', async () => {
    await expect(
      fetch('http://localhost:3000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({
          // Missing model field
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

  test('should reject missing messages', async () => {
    await expect(
      fetch('http://localhost:3000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          // Missing messages field
        }),
      }).then(res => res.json())
    ).resolves.toMatchObject({
      error: {
        type: 'invalid_request_error',
        message: expect.stringContaining('messages'),
      },
    });
  });

  test('should reject empty messages array', async () => {
    await expect(
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [], // Empty array
      })
    ).rejects.toMatchObject({
      status: 400,
      error: {
        type: 'invalid_request_error',
      },
    });
  });
});
```

### Testing No Match Scenarios

```typescript
describe('Response Matching', () => {
  test('should return error for unmatched requests', async () => {
    await expect(
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'This message has no configured response' }],
      })
    ).rejects.toMatchObject({
      status: 400,
      error: {
        type: 'invalid_request_error',
        message: 'No matching response found for the provided messages',
      },
    });
  });
});
```

## Error Response Configuration

### Simulating Content Filtering

```yaml
responses:
  - id: "content-filter-simulation"
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
            content: "I can't assist with that request."
          finish_reason: "content_filter"  # Indicates content was filtered
      usage:
        prompt_tokens: 8
        completion_tokens: 8
        total_tokens: 16
```

```typescript
test('should handle content filtering', async () => {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'inappropriate request' }],
  });

  expect(response.choices[0].finish_reason).toBe('content_filter');
  expect(response.choices[0].message.content).toContain("can't assist");
});
```

### Simulating Rate Limiting

While the mock doesn't implement actual rate limiting, you can simulate rate limit responses:

```yaml
responses:
  - id: "rate-limit-simulation"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "rate limit test"
    response:
      id: "chatcmpl-rate-limited"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Request rate limit exceeded. Please try again later."
          finish_reason: "stop"
      usage:
        prompt_tokens: 8
        completion_tokens: 12
        total_tokens: 20
```

## Error Recovery Patterns

### Retry Logic Testing

```typescript
class ResilientChatService {
  constructor(private openai: OpenAI) {}

  async sendMessageWithRetry(message: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }],
        });
        return response.choices[0].message.content;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('All retry attempts failed');
  }
}

// Test the retry logic
describe('Error Recovery', () => {
  test('should retry on failure and eventually succeed', async () => {
    const service = new ResilientChatService(openai);
    
    // Configure mock to fail first few times, then succeed
    // This would require more sophisticated mock setup
    
    const result = await service.sendMessageWithRetry('Hello');
    expect(result).toBeDefined();
  });
});
```

### Graceful Degradation

```typescript
class ChatServiceWithFallback {
  constructor(private openai: OpenAI) {}

  async getResponse(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
      });
      return response.choices[0].message.content;
    } catch (error) {
      // Fallback to predefined responses
      return this.getFallbackResponse(message);
    }
  }

  private getFallbackResponse(message: string): string {
    if (message.toLowerCase().includes('hello')) {
      return 'Hello! I apologize, but I\'m experiencing technical difficulties.';
    }
    return 'I\'m sorry, I\'m unable to process your request at the moment.';
  }
}

// Test graceful degradation
test('should provide fallback when API fails', async () => {
  const service = new ChatServiceWithFallback(openai);
  
  // This message won't match any configured responses
  const result = await service.getResponse('unmatched message');
  expect(result).toContain('unable to process');
});
```

## Error Logging and Monitoring

### Structured Error Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console(),
  ],
});

class MonitoredChatService {
  constructor(private openai: OpenAI) {}

  async sendMessage(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
      });

      logger.info('Chat completion successful', {
        messageLength: message.length,
        responseLength: response.choices[0].message.content.length,
        model: response.model,
        usage: response.usage,
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Chat completion failed', {
        message: message,
        error: error.message,
        status: error.status,
        type: error.error?.type,
        code: error.error?.code,
      });
      throw error;
    }
  }
}
```

### Error Metrics

```typescript
class MetricsCollector {
  private errorCounts = new Map<string, number>();
  private successCount = 0;

  recordSuccess() {
    this.successCount++;
  }

  recordError(errorType: string) {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  getMetrics() {
    const totalRequests = this.successCount + 
      Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    
    return {
      successRate: this.successCount / totalRequests,
      errorBreakdown: Object.fromEntries(this.errorCounts),
      totalRequests,
    };
  }
}

// Use in tests
const metrics = new MetricsCollector();

test('should track error metrics correctly', async () => {
  try {
    await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    metrics.recordSuccess();
  } catch (error) {
    metrics.recordError(error.error?.type || 'unknown');
  }

  const results = metrics.getMetrics();
  expect(results.totalRequests).toBeGreaterThan(0);
});
```

## Best Practices

1. **Test Both Success and Failure Paths**: Ensure your application handles errors gracefully
2. **Use Specific Error Assertions**: Check error types, codes, and messages
3. **Test Edge Cases**: Empty requests, invalid formats, oversized payloads
4. **Implement Retry Logic**: Test exponential backoff and circuit breaker patterns
5. **Monitor Error Rates**: Track error patterns in your tests
6. **Provide Fallbacks**: Test graceful degradation when APIs are unavailable
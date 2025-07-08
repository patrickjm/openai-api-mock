---
title: Streaming Responses
description: How to test Server-Sent Events streaming with OpenAI Mock API
---

# Streaming Responses

OpenAI Mock API supports full Server-Sent Events (SSE) streaming, allowing you to test streaming chat completions just like the real OpenAI API.

## How Streaming Works

When you request a streaming response, the mock server:

1. Takes your configured response content
2. Splits it into chunks (words or characters)
3. Sends each chunk as a separate SSE event
4. Maintains the same format as OpenAI's streaming API

## Basic Streaming Example

### Client Code

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'test-key',
  baseURL: 'http://localhost:3000/v1',
});

const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true, // Enable streaming
});

let fullContent = '';
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
  fullContent += content;
}
```

### Configuration

```yaml
apiKey: 'test-key'
responses:
  - id: 'story-request'
    matcher:
      type: 'contains'
      messages:
        - role: 'user'
          content: 'story'
    response:
      id: 'chatcmpl-story'
      object: 'chat.completion'
      created: 1677649420
      model: 'gpt-3.5-turbo'
      choices:
        - index: 0
          message:
            role: 'assistant'
            content: 'Once upon a time, there was a brave developer who created amazing applications using AI.'
          finish_reason: 'stop'
      usage:
        prompt_tokens: 10
        completion_tokens: 18
        total_tokens: 28
```

## Stream Response Format

The mock server sends chunks in this format:

```
data: {"id":"chatcmpl-story","object":"chat.completion.chunk","created":1677649420,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Once"},"finish_reason":null}]}

data: {"id":"chatcmpl-story","object":"chat.completion.chunk","created":1677649420,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" upon"},"finish_reason":null}]}

data: {"id":"chatcmpl-story","object":"chat.completion.chunk","created":1677649420,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" a"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-story","object":"chat.completion.chunk","created":1677649420,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## Advanced Streaming Patterns

### Testing Stream Interruption

```typescript
describe('Streaming', () => {
  test('should handle stream interruption', async () => {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Long response' }],
      stream: true,
    });

    let chunkCount = 0;
    try {
      for await (const chunk of stream) {
        chunkCount++;
        if (chunkCount > 5) {
          stream.controller.abort(); // Interrupt the stream
          break;
        }
      }
    } catch (error) {
      expect(error.name).toBe('AbortError');
    }
  });
});
```

### Testing Different Content Types

````yaml
responses:
  # Short response - fewer chunks
  - id: 'short-stream'
    matcher:
      type: 'exact'
      messages:
        - role: 'user'
          content: 'Hi'
    response:
      id: 'chatcmpl-short'
      object: 'chat.completion'
      created: 1677649420
      model: 'gpt-3.5-turbo'
      choices:
        - index: 0
          message:
            role: 'assistant'
            content: 'Hello!'
          finish_reason: 'stop'
      usage:
        prompt_tokens: 1
        completion_tokens: 2
        total_tokens: 3

  # Long response - many chunks
  - id: 'long-stream'
    matcher:
      type: 'contains'
      messages:
        - role: 'user'
          content: 'explain'
    response:
      id: 'chatcmpl-long'
      object: 'chat.completion'
      created: 1677649420
      model: 'gpt-3.5-turbo'
      choices:
        - index: 0
          message:
            role: 'assistant'
            content: |
              Here's a detailed explanation of the concept you asked about. 
              This response will be broken into multiple chunks when streamed.

              First, let me cover the basic principles:
              1. Streaming allows real-time content delivery
              2. Server-Sent Events provide the transport mechanism
              3. Clients can process data as it arrives

              The benefits include improved user experience and reduced perceived latency.
          finish_reason: 'stop'
      usage:
        prompt_tokens: 5
        completion_tokens: 65
        total_tokens: 70

  # Code response - structured content
  - id: 'code-stream'
    matcher:
      type: 'contains'
      messages:
        - role: 'user'
          content: 'code'
    response:
      id: 'chatcmpl-code'
      object: 'chat.completion'
      created: 1677649420
      model: 'gpt-4'
      choices:
        - index: 0
          message:
            role: 'assistant'
            content: |
              Here's a Python example:

              ```python
              def greet(name):
                  return f"Hello, {name}!"

              # Usage
              message = greet("World")
              print(message)
              ```

              This function demonstrates basic string formatting.
          finish_reason: 'stop'
      usage:
        prompt_tokens: 8
        completion_tokens: 35
        total_tokens: 43
````

## Stream Testing Patterns

### Collecting Full Response

```typescript
test('should stream complete response', async () => {
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Tell me about streaming' }],
    stream: true,
  });

  const chunks: string[] = [];
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      chunks.push(content);
    }
  }

  const fullResponse = chunks.join('');
  expect(fullResponse).toContain('streaming');
  expect(chunks.length).toBeGreaterThan(1); // Should be multiple chunks
});
```

### Testing Stream Timing

```typescript
test('should stream with reasonable timing', async () => {
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Long explanation' }],
    stream: true,
  });

  const timestamps: number[] = [];
  for await (const chunk of stream) {
    timestamps.push(Date.now());
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      // Process chunk
    }
  }

  // Check that chunks arrive with reasonable intervals
  for (let i = 1; i < timestamps.length; i++) {
    const interval = timestamps[i] - timestamps[i - 1];
    expect(interval).toBeLessThan(1000); // Less than 1 second between chunks
  }
});
```

### Testing Error Handling in Streams

```typescript
test('should handle streaming errors gracefully', async () => {
  // This would typically be done by stopping the mock server
  // or configuring an error response

  await expect(async () => {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'unmatched request' }],
      stream: true,
    });

    for await (const chunk of stream) {
      // Process chunks
    }
  }).rejects.toThrow();
});
```

## Stream Compatibility

### Real-Time UI Updates

```typescript
// Example: React component with streaming
function ChatComponent() {
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (userMessage: string) => {
    setIsStreaming(true);
    setMessage('');

    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userMessage }],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        setMessage(prev => prev + content);
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <div>{message}</div>
      {isStreaming && <div>Typing...</div>}
    </div>
  );
}
```

### Testing the UI Component

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

test('should update UI as stream progresses', async () => {
  render(<ChatComponent />);

  const button = screen.getByText('Send');
  fireEvent.click(button);

  // Should show typing indicator
  expect(screen.getByText('Typing...')).toBeInTheDocument();

  // Should gradually show content
  await waitFor(() => {
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  // Should complete and hide typing indicator
  await waitFor(() => {
    expect(screen.queryByText('Typing...')).not.toBeInTheDocument();
  });
});
```

## Performance Considerations

### Chunk Size and Timing

The mock server automatically chunks responses, but you can influence this with content structure:

```yaml
# This will create more natural chunks
response:
  choices:
    - index: 0
      message:
        role: "assistant"
        content: "Short sentences. Create natural. Chunk boundaries. For better. Streaming experience."
      finish_reason: "stop"

# This might create fewer, larger chunks
response:
  choices:
    - index: 0
      message:
        role: "assistant"
        content: "Thisissinglewordwithoutnaturalbreakpoints"
      finish_reason: "stop"
```

### Memory Management

For long-running tests with many streams:

```typescript
test('should handle multiple concurrent streams', async () => {
  const streams = Array(5)
    .fill(0)
    .map(() =>
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Concurrent stream test' }],
        stream: true,
      })
    );

  const results = await Promise.all(
    streams.map(async (streamPromise) => {
      const stream = await streamPromise;
      const chunks: string[] = [];

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) chunks.push(content);
      }

      return chunks.join('');
    })
  );

  expect(results).toHaveLength(5);
  results.forEach((result) => {
    expect(result).toBeTruthy();
  });
});
```

## Debugging Streams

### Logging Stream Events

```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Debug streaming' }],
  stream: true,
});

let chunkIndex = 0;
for await (const chunk of stream) {
  console.log(`Chunk ${chunkIndex}:`, {
    id: chunk.id,
    object: chunk.object,
    created: chunk.created,
    choices: chunk.choices,
  });
  chunkIndex++;
}
```

This helps understand the exact format and timing of streamed responses during development.

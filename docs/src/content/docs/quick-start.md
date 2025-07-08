---
title: Quick Start
description: Get up and running with OpenAI Mock API in minutes
---

# Quick Start

Get your mock OpenAI API server running in less than 5 minutes.

## Step 1: Create Configuration

Create a `config.yaml` file with your first mock response:

```yaml
apiKey: "test-api-key-12345"
port: 3000
responses:
  - id: "greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello, how are you?"
    response:
      id: "chatcmpl-example"
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
```

## Step 2: Start the Server

Run the mock server using npx (no installation required):

```bash
npx openai-mock-api --config config.yaml
```

You can also pipe configuration from stdin:

```bash
# Using pipe
cat config.yaml | npx openai-mock-api

# Using input redirection
npx openai-mock-api < config.yaml

# Explicitly specify stdin
npx openai-mock-api --config -
```

You should see output like:
```
Mock OpenAI API server started on port 3000
```

## Step 3: Test Your Setup

Create a simple test script or use curl:

### Using curl
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-12345" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

### Using OpenAI Client
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'test-api-key-12345',
  baseURL: 'http://localhost:3000/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
});

console.log(response.choices[0].message.content);
// Output: "Hello! I'm doing well, thank you for asking."
```

## Step 4: Add More Responses

Extend your configuration with different matcher types:

```yaml
apiKey: "test-api-key-12345"
port: 3000
responses:
  - id: "greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello, how are you?"
    response:
      # ... response configuration

  - id: "help-requests"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "help"
    response:
      id: "chatcmpl-help"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "I'd be happy to help! What do you need assistance with?"
          finish_reason: "stop"
      usage:
        prompt_tokens: 10
        completion_tokens: 15
        total_tokens: 25

  - id: "non-debug"
    matcher:
      type: "contains"
      invert: true  # Matches messages that DON'T contain "debug"
      messages:
        - role: "user"
          content: "debug"
    response:
      id: "chatcmpl-normal"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "This is a normal response for non-debug requests."
          finish_reason: "stop"
      usage:
        prompt_tokens: 8
        completion_tokens: 12
        total_tokens: 20
```

## CLI Options

Customize the server with command-line options:

```bash
# Custom port
npx openai-mock-api --config config.yaml --port 3001

# Enable verbose logging
npx openai-mock-api --config config.yaml --verbose

# Log to file
npx openai-mock-api --config config.yaml --log-file server.log

# Quick test with inline config
echo 'apiKey: test
port: 3000
responses:
  - id: test
    messages:
      - role: user
        content: Hi
      - role: assistant
        content: Hello!' | npx openai-mock-api

# See all options
npx openai-mock-api --help
```

## Next Steps

- [Learn about matcher types →](/configuration/matchers)
- [Explore response configuration →](/configuration/responses) 
- [See integration examples →](/guides/integration-examples)
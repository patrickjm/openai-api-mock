---
title: Configuration Overview
description: Learn the basics of configuring OpenAI Mock API
---

# Configuration Overview

OpenAI Mock API uses YAML configuration files to define how it should respond to different message patterns.

## Basic Structure

```yaml
# Required: API key for authentication
apiKey: "your-test-api-key"

# Optional: Port to run on (default: 3000)
port: 3000

# Required: Array of response configurations
responses:
  - id: "unique-identifier"
    matcher:
      type: "exact"  # or "fuzzy", "regex", "contains"
      messages:
        - role: "user"
          content: "Hello"
    response:
      # OpenAI-compatible response object
      id: "chatcmpl-example"
      object: "chat.completion"
      # ... more response fields
```

## Configuration Fields

### Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | Authentication key for API requests |
| `port` | number | No | Server port (default: 3000) |
| `responses` | array | Yes | Array of response configurations |

### Response Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for this response |
| `matcher` | object | Yes | Message matching configuration |
| `response` | object | Yes | OpenAI-compatible response |

### Matcher Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | One of: "exact", "fuzzy", "regex", "contains" |
| `messages` | array | Yes | Array of message patterns to match |
| `threshold` | number | No | For fuzzy matching (0.0-1.0, default: 0.8) |
| `invert` | boolean | No | Invert the match result (default: false) |

## Minimal Example

```yaml
apiKey: "test-key"
responses:
  - id: "hello"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello"
    response:
      id: "chatcmpl-hello"
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
        completion_tokens: 8
        total_tokens: 10
```

## Complete Example

```yaml
apiKey: "test-api-key-12345"
port: 3000

responses:
  # Exact match for greetings
  - id: "greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello, how are you?"
    response:
      id: "chatcmpl-greeting"
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

  # Fuzzy match for help requests
  - id: "help-request"
    matcher:
      type: "fuzzy"
      threshold: 0.7
      messages:
        - role: "user"
          content: "I need help"
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

  # Contains match for weather queries
  - id: "weather"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "weather"
    response:
      id: "chatcmpl-weather"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "The weather is nice today!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 8
        completion_tokens: 7
        total_tokens: 15

  # Regex match for code requests
  - id: "code-request"
    matcher:
      type: "regex"
      messages:
        - role: "user"
          content: ".*(code|programming|script).*"
    response:
      id: "chatcmpl-code"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-4"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "I can help you with coding! What would you like to know?"
          finish_reason: "stop"
      usage:
        prompt_tokens: 12
        completion_tokens: 14
        total_tokens: 26

  # Inverted match - anything NOT containing "admin"
  - id: "non-admin"
    matcher:
      type: "contains"
      invert: true
      messages:
        - role: "user"
          content: "admin"
    response:
      id: "chatcmpl-normal"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "This is a normal user request."
          finish_reason: "stop"
      usage:
        prompt_tokens: 6
        completion_tokens: 8
        total_tokens: 14
```

## Configuration Tips

### Order Matters
Responses are evaluated in the order they appear in the configuration. The first matching response is used.

```yaml
responses:
  # This specific match should come first
  - id: "specific"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "help with Python"
    response:
      # ... specific response

  # This general match should come after
  - id: "general"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "help"
    response:
      # ... general response
```

### Use Descriptive IDs
Choose clear, descriptive IDs for easier debugging:

```yaml
# Good
- id: "weather-forecast-request"
- id: "python-code-help"
- id: "greeting-formal"

# Less clear
- id: "response1"
- id: "test"
- id: "r1"
```

### Environment Variables
You can use environment variables in your configuration:

```yaml
apiKey: "${API_KEY:-default-test-key}"
port: "${PORT:-3000}"
```

### File Organization
For complex configurations, consider splitting into multiple files and using YAML anchors:

```yaml
# Common response template
common_response: &common_response
  object: "chat.completion"
  created: 1677649420
  model: "gpt-3.5-turbo"

responses:
  - id: "greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello"
    response:
      <<: *common_response
      id: "chatcmpl-greeting"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Hello!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 2
        completion_tokens: 2
        total_tokens: 4
```
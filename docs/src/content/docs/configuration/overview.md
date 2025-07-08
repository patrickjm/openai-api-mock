---
title: Configuration Overview
description: Learn the basics of configuring OpenAI Mock API
---

# Configuration Overview

OpenAI Mock API uses YAML configuration files to define conversation flows and their responses.

## Basic Structure

```yaml
# Required: API key for authentication
apiKey: "your-test-api-key"

# Optional: Port to run on (default: 3000)
port: 3000

# Required: Array of response configurations
responses:
  - id: "unique-identifier"
    messages:
      - role: "user"
        content: "Hello"
        # Optional: matcher type (default: "exact")
        matcher: "exact"  # or "fuzzy", "regex", "contains", "any"
      - role: "assistant"
        content: "Hello! How can I help you?"
```

## Configuration Fields

### Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | Authentication key for API requests |
| `port` | number | No | Server port (default: 3000) |
| `responses` | array | Yes | Array of conversation flow configurations |

### Response Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for this conversation flow |
| `messages` | array | Yes | Array of messages defining the conversation flow |

### Message Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | One of: "user", "assistant", "system", "tool" |
| `content` | string | Conditional | Message content (required unless matcher is "any") |
| `matcher` | string | No | Matching type: "exact" (default), "fuzzy", "regex", "contains", "any" |
| `threshold` | number | No | For fuzzy matching (0.0-1.0, default: 0.8) |
| `tool_calls` | array | No | For assistant messages with tool calls |
| `tool_call_id` | string | No | For tool role messages |

## Minimal Example

```yaml
apiKey: "test-key"
responses:
  - id: "hello"
    messages:
      - role: "user"
        content: "Hello"
      - role: "assistant"
        content: "Hello! How can I help you?"
```

## Complete Example

```yaml
apiKey: "test-api-key-12345"
port: 3000

responses:
  # Exact match for greetings (default behavior)
  - id: "greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "Hello! I'm doing well, thank you for asking."

  # Fuzzy match for help requests
  - id: "help-request"
    messages:
      - role: "user"
        content: "I need help"
        matcher: "fuzzy"
        threshold: 0.7
      - role: "assistant"
        content: "I'd be happy to help! What do you need assistance with?"

  # Contains match for weather queries
  - id: "weather"
    messages:
      - role: "user"
        content: "weather"
        matcher: "contains"
      - role: "assistant"
        content: "The weather is nice today!"

  # Regex match for code requests
  - id: "code-request"
    messages:
      - role: "user"
        content: ".*(code|programming|script).*"
        matcher: "regex"
      - role: "assistant"
        content: "I can help you with coding! What would you like to know?"

  # Any match - flexible conversation flow
  - id: "flexible-flow"
    messages:
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "Thanks for your message!"

  # Multi-turn conversation with tool calls
  - id: "weather-tool-flow"
    messages:
      - role: "user"
        content: "weather"
        matcher: "contains"
      - role: "assistant"
        tool_calls:
          - id: "call_abc123"
            type: "function"
            function:
              name: "get_weather"
              arguments: '{"location": "San Francisco"}'
      - role: "tool"
        matcher: "any"
        tool_call_id: "call_abc123"
      - role: "assistant"
        content: "It's sunny in San Francisco!"
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
For complex configurations, consider using YAML anchors for common patterns:

```yaml
# Common assistant response template
assistant_response: &assistant_response
  role: "assistant"

responses:
  - id: "greeting"
    messages:
      - role: "user"
        content: "Hello"
      - <<: *assistant_response
        content: "Hello! How can I help you?"

  - id: "farewell"
    messages:
      - role: "user"
        content: "Goodbye"
      - <<: *assistant_response
        content: "Goodbye! Have a great day!"
```
---
title: Response Configuration
description: Learn how to configure conversation flows and responses
---

# Response Configuration

OpenAI Mock API uses a conversation-first approach where you define complete conversation flows. The system automatically generates OpenAI-compatible responses based on the final assistant message in each flow.

## Basic Response Structure

```yaml
responses:
  - id: 'greeting'
    messages:
      - role: 'user'
        content: 'Hello, how are you?'
      - role: 'assistant'
        content: 'Hello! I am doing well, thank you for asking.'
```

This automatically generates a complete OpenAI-compatible response:

```json
{
  "id": "chatcmpl-greeting",
  "object": "chat.completion",
  "created": 1677649420,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I am doing well, thank you for asking."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 12,
    "total_tokens": 27
  }
}
```

## Response Fields

### Automatically Generated Fields

The system automatically generates these OpenAI-compatible fields:

| Field     | Description                          | Value                      |
| --------- | ------------------------------------ | -------------------------- |
| `id`      | Unique identifier for the completion | `chatcmpl-{response-id}`   |
| `object`  | Response type                        | `"chat.completion"`        |
| `created` | Unix timestamp of creation           | Current timestamp          |
| `model`   | Model identifier                     | From request or default    |
| `choices` | Array of completion choices          | Single choice with message |
| `usage`   | Token usage information              | Calculated automatically   |

### Token Calculation

Token counts are automatically calculated using OpenAI's tiktoken library:

- **Prompt tokens**: Calculated from input messages
- **Completion tokens**: Calculated from assistant response content
- **Total tokens**: Sum of prompt and completion tokens

## Configuration Examples

### Simple Response

```yaml
responses:
  - id: 'greeting'
    messages:
      - role: 'user'
        content: 'Hello'
      - role: 'assistant'
        content: 'Hello! How can I help you today?'
```

### Multi-line Response

```yaml
responses:
  - id: 'help-guide'
    messages:
      - role: 'user'
        content: 'I need help'
        matcher: 'fuzzy'
        threshold: 0.8
      - role: 'assistant'
        content: |
          I'd be happy to help! Here are some things I can assist with:

          1. General questions and information
          2. Problem-solving and troubleshooting
          3. Code examples and explanations
          4. Creative writing and brainstorming

          What specific help do you need?
```

### Code Response

````yaml
responses:
  - id: 'python-example'
    messages:
      - role: 'user'
        content: 'python'
        matcher: 'contains'
      - role: 'assistant'
        content: |
          Here's a Python example:

          ```python
          def hello_world():
              print("Hello, World!")

          hello_world()
          ```

          This function prints a greeting message.
````

### Multi-Turn Conversation

```yaml
responses:
  - id: 'booking-flow'
    messages:
      - role: 'user'
        content: 'I want to book a table'
      - role: 'assistant'
        content: 'I can help you book a table! How many people will be dining?'
      - role: 'user'
        content: '4 people'
      - role: 'assistant'
        content: 'Perfect! For 4 people. What time would you prefer?'
```

### Tool Call Response

```yaml
responses:
  - id: 'weather-tool'
    messages:
      - role: 'user'
        content: 'weather in San Francisco'
        matcher: 'contains'
      - role: 'assistant'
        tool_calls:
          - id: 'call_abc123'
            type: 'function'
            function:
              name: 'get_weather'
              arguments: '{"location": "San Francisco"}'
      - role: 'tool'
        tool_call_id: 'call_abc123'
        content: '{"temperature": 72, "condition": "sunny"}'
      - role: 'assistant'
        content: "It's currently 72°F and sunny in San Francisco!"
```

## Conversation Flow Features

### Partial Matching

All conversation flows support partial matching. If the incoming conversation matches the beginning of a flow, it returns the final assistant response:

```yaml
responses:
  - id: 'multi-turn-flow'
    messages:
      - role: 'user'
        content: 'Start conversation'
      - role: 'assistant'
        content: 'Hello! How can I help you?'
      - role: 'user'
        content: 'Tell me about the weather'
      - role: 'assistant'
        content: 'The weather is sunny today!'
```

This matches:

- Just `["Start conversation"]` → Returns: `"The weather is sunny today!"`
- `["Start conversation", "Hello! How can I help you?"]` → Returns: `"The weather is sunny today!"`
- Full conversation → Returns: `"The weather is sunny today!"`

### Flexible Matching

Use different matcher types for natural conversation handling:

```yaml
responses:
  - id: 'flexible-help'
    messages:
      - role: 'user'
        content: 'I need assistance'
        matcher: 'fuzzy'
        threshold: 0.7
      - role: 'assistant'
        content: 'I can help you! What do you need assistance with?'

  - id: 'any-question'
    messages:
      - role: 'user'
        matcher: 'any'
      - role: 'assistant'
        content: 'Thanks for your question! Let me help you with that.'
```

## Best Practices

### Response Content

1. **Natural Language**: Write responses as if they came from a real AI assistant
2. **Helpful Format**: Use markdown, lists, and code blocks where appropriate
3. **Consistent Tone**: Maintain a helpful, professional tone across responses

### Conversation Design

1. **Realistic Flows**: Design conversation flows that match real user interactions
2. **Appropriate Length**: Keep responses reasonably sized for your use case
3. **Clear Progression**: Each turn should logically follow from the previous

### Organization

1. **Descriptive IDs**: Use clear, descriptive IDs for your responses
2. **Logical Order**: Order responses from most specific to most general
3. **Consistent Patterns**: Use similar patterns across related responses

### Testing Considerations

1. **Edge Cases**: Include responses for error conditions and edge cases
2. **Fallback Responses**: Add catch-all responses for unmatched requests
3. **Realistic Scenarios**: Test with actual conversation patterns from your application

## Error Handling

If no response matches the incoming conversation, the server returns a 400 error:

```json
{
  "error": {
    "message": "No matching response found for the given conversation",
    "type": "invalid_request_error",
    "code": "no_match"
  }
}
```

To handle this, add a catch-all response:

```yaml
responses:
  # ... your specific responses ...

  # Catch-all (place last)
  - id: 'fallback'
    messages:
      - role: 'user'
        content: '.*'
        matcher: 'regex'
      - role: 'assistant'
        content: 'I apologize, but I do not understand that request. Could you please rephrase it?'
```

This conversation-first approach makes it easy to design realistic test scenarios while automatically handling all the OpenAI API compatibility details.

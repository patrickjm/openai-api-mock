---
title: Response Format
description: Learn how to configure OpenAI-compatible responses
---

# Response Format

OpenAI API Mock returns responses that match the OpenAI API format exactly, ensuring compatibility with existing client libraries.

## Basic Response Structure

```yaml
response:
  id: "chatcmpl-unique-id"
  object: "chat.completion"
  created: 1677649420
  model: "gpt-3.5-turbo"
  choices:
    - index: 0
      message:
        role: "assistant"
        content: "Your response content here"
      finish_reason: "stop"
  usage:
    prompt_tokens: 15
    completion_tokens: 12
    total_tokens: 27
```

## Response Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the completion |
| `object` | string | Always "chat.completion" |
| `created` | number | Unix timestamp of creation |
| `model` | string | Model identifier (returned as-is) |
| `choices` | array | Array of completion choices |
| `usage` | object | Token usage information |

### Choice Object

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | Choice index (usually 0) |
| `message` | object | The response message |
| `finish_reason` | string | Why the completion finished |

### Message Object

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | Always "assistant" for responses |
| `content` | string | The actual response text |

### Usage Object

| Field | Type | Description |
|-------|------|-------------|
| `prompt_tokens` | number | Tokens in the input |
| `completion_tokens` | number | Tokens in the output |
| `total_tokens` | number | Sum of prompt and completion tokens |

## Common Finish Reasons

- `"stop"` - Natural completion
- `"length"` - Hit token limit
- `"function_call"` - Function call (not commonly used in mock)
- `"content_filter"` - Content was filtered

## Examples

### Simple Response
```yaml
response:
  id: "chatcmpl-simple"
  object: "chat.completion"
  created: 1677649420
  model: "gpt-3.5-turbo"
  choices:
    - index: 0
      message:
        role: "assistant"
        content: "Hello! How can I help you today?"
      finish_reason: "stop"
  usage:
    prompt_tokens: 10
    completion_tokens: 9
    total_tokens: 19
```

### Multi-line Response
```yaml
response:
  id: "chatcmpl-multiline"
  object: "chat.completion"
  created: 1677649420
  model: "gpt-4"
  choices:
    - index: 0
      message:
        role: "assistant"
        content: |
          Here's a multi-line response:
          
          1. First point
          2. Second point
          3. Third point
          
          I hope this helps!
      finish_reason: "stop"
  usage:
    prompt_tokens: 15
    completion_tokens: 25
    total_tokens: 40
```

### Code Response
```yaml
response:
  id: "chatcmpl-code"
  object: "chat.completion"  
  created: 1677649420
  model: "gpt-4"
  choices:
    - index: 0
      message:
        role: "assistant"
        content: |
          Here's a Python example:
          
          ```python
          def hello_world():
              print("Hello, World!")
          
          hello_world()
          ```
      finish_reason: "stop"
  usage:
    prompt_tokens: 8
    completion_tokens: 22
    total_tokens: 30
```

### Error Response
```yaml
response:
  id: "chatcmpl-error"
  object: "chat.completion"
  created: 1677649420
  model: "gpt-3.5-turbo"
  choices:
    - index: 0
      message:
        role: "assistant"
        content: "I'm sorry, I can't help with that request."
      finish_reason: "content_filter"
  usage:
    prompt_tokens: 12
    completion_tokens: 10
    total_tokens: 22
```

## Advanced Features

### Dynamic Timestamps
Use the current timestamp for more realistic responses:

```yaml
# Note: This shows the format - the mock uses static values
response:
  id: "chatcmpl-dynamic"
  object: "chat.completion"
  created: 1677649420  # Static timestamp
  # ... rest of response
```

### Model Variations
Different models for different response types:

```yaml
responses:
  - id: "quick-answer"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "quick"
    response:
      model: "gpt-3.5-turbo"  # Faster model for simple queries
      # ... rest of response

  - id: "complex-analysis"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "analyze"
    response:
      model: "gpt-4"  # More capable model for complex tasks
      # ... rest of response
```

### Token Usage Patterns
Realistic token counts for different response types:

```yaml
# Short responses
usage:
  prompt_tokens: 10
  completion_tokens: 5
  total_tokens: 15

# Medium responses  
usage:
  prompt_tokens: 25
  completion_tokens: 35
  total_tokens: 60

# Long responses
usage:
  prompt_tokens: 50
  completion_tokens: 150
  total_tokens: 200
```

## Best Practices

### Realistic Token Counts
Make token counts proportional to content length:
- ~4 characters per token for English text
- Code typically has fewer tokens per character
- Include reasonable prompt token estimates

### Consistent IDs
Use descriptive but unique completion IDs:

```yaml
# Good patterns
id: "chatcmpl-greeting-001"
id: "chatcmpl-help-python"
id: "chatcmpl-weather-20231201"

# Avoid
id: "test"
id: "response1"  
id: "abc123"
```

### Appropriate Finish Reasons
- Use `"stop"` for most normal completions
- Use `"length"` only for very long responses
- Use `"content_filter"` for error/rejection responses

### Model Names
Use realistic OpenAI model names:
- `"gpt-3.5-turbo"`
- `"gpt-4"`
- `"gpt-4-turbo-preview"`
- Custom names are allowed but may confuse clients
---
title: Matcher Types
description: Learn about the different message matching strategies available
---

# Matcher Types

OpenAI Mock API supports four different matching strategies, each with optional inversion capabilities.

## Exact Match

Matches messages exactly as specified, including whitespace (trimmed). This is the default matcher.

```yaml
responses:
  - id: 'greeting'
    messages:
      - role: 'user'
        content: 'Hello, how are you?'
        # matcher: 'exact' is the default
      - role: 'assistant'
        content: 'Hello! How can I help you?'
```

**Use cases:**

- Testing specific prompts
- Ensuring exact phrase matching
- Validating precise user inputs

**Characteristics:**

- Case-sensitive
- Whitespace is trimmed but preserved internally
- Message order and roles must match exactly

## Fuzzy Match

Uses fuzzy string matching with configurable similarity thresholds.

```yaml
responses:
  - id: 'help-request'
    messages:
      - role: 'user'
        content: 'I need help with something'
        matcher: 'fuzzy'
        threshold: 0.8 # 0.0 to 1.0, higher = more similar required
      - role: 'assistant'
        content: 'I can help you with that!'
```

**Configuration:**

- `threshold`: Similarity score from 0.0 (any match) to 1.0 (exact match)
- Default threshold: 0.8
- Recommended range: 0.6-0.9

**Examples:**

```yaml
# This matcher with threshold 0.7 would match:
# - "I need help with anything" ✓
# - "I require assistance with something" ✓
# - "Help me with this" ✓
# - "Where is the bathroom?" ✗
```

**Use cases:**

- Testing similar but not identical inputs
- Handling natural language variations
- Accommodating typos and slight variations

## Regex Match

Matches messages using regular expressions with case-insensitive flag.

```yaml
responses:
  - id: 'code-request'
    messages:
      - role: 'user'
        content: '.*code.*python.*' # Contains "code" and "python"
        matcher: 'regex'
      - role: 'assistant'
        content: 'I can help you with Python code!'
```

**Features:**

- Case-insensitive by default
- Full JavaScript regex syntax support
- Powerful pattern matching capabilities

**Examples:**

```yaml
# Match any code-related question
- content: '.*(code|programming|script).*'

# Match specific patterns
- content: "^(hello|hi|hey)\\s+.*" # Starts with greeting

# Match numbers
- content: ".*\\d+.*" # Contains any number

# Match email-like patterns
- content: ".*@.*\\..*" # Contains @ and . (simplified email)
```

**Use cases:**

- Pattern-based matching
- Complex conditional logic
- Flexible content validation

## Contains Match

Matches messages that contain the specified substring (case-insensitive).

```yaml
responses:
  - id: 'weather-info'
    messages:
      - role: 'user'
        content: 'weather' # Matches any message containing "weather"
        matcher: 'contains'
      - role: 'assistant'
        content: 'The weather is nice today!'
```

**Features:**

- Case-insensitive substring matching
- Simple and intuitive
- Good performance

**Examples:**

```yaml
# This matcher would match:
# - "What's the weather like?" ✓
# - "Weather forecast please" ✓
# - "WEATHER UPDATE" ✓
# - "Is it going to rain?" ✗
```

**Use cases:**

- Keyword-based routing
- Topic detection
- Simple content filtering

## Any Match

Matches any message of the specified role, useful for flexible conversation flows:

```yaml
responses:
  - id: 'flexible-response'
    messages:
      - role: 'user'
        matcher: 'any' # No content field needed
      - role: 'assistant'
        content: 'Thanks for your message!'
```

**How it works:**

1. The base matcher is evaluated normally
2. If `invert: true`, the result is flipped
3. `true` becomes `false`, `false` becomes `true`

**Examples:**

### Example Configurations

```yaml
# Exact match for greetings
responses:
  - id: 'greeting'
    messages:
      - role: 'user'
        content: 'Hello'
        matcher: 'exact'
      - role: 'assistant'
        content: 'Hello! How can I help you?'

  # Fuzzy match for help requests
  - id: 'help-fuzzy'
    messages:
      - role: 'user'
        content: 'I need assistance'
        matcher: 'fuzzy'
        threshold: 0.7
      - role: 'assistant'
        content: 'I can help you with that!'

  # Regex match for code questions
  - id: 'code-regex'
    messages:
      - role: 'user'
        content: '.*(code|programming|script).*'
        matcher: 'regex'
      - role: 'assistant'
        content: 'I can help you with coding!'

  # Contains match for weather
  - id: 'weather-contains'
    messages:
      - role: 'user'
        content: 'weather'
        matcher: 'contains'
      - role: 'assistant'
        content: 'The weather is nice today!'
```

## Multi-Message Matching

All matchers support multi-message conversations with partial matching:

```yaml
responses:
  - id: 'conversation-flow'
    messages:
      - role: 'system'
        content: 'You are a helpful assistant.'
        matcher: 'any'
      - role: 'user'
        content: 'Hello'
      - role: 'assistant'
        content: 'Hi there!'
      - role: 'user'
        content: 'How are you?'
      - role: 'assistant'
        content: 'I am doing well, thank you!'
```

**Requirements:**

- All messages must match in order
- Roles must match exactly
- Message count must match exactly

## Best Practices

### Choosing the Right Matcher

- **Exact**: When you need precise control and known inputs
- **Contains**: For keyword-based routing and simple matching
- **Fuzzy**: When handling natural language variations
- **Regex**: For complex patterns and advanced matching logic

### Performance Considerations

From fastest to slowest:

1. **Exact** - Simple string comparison
2. **Contains** - Substring search
3. **Regex** - Pattern matching
4. **Fuzzy** - Similarity calculation

### Common Patterns

```yaml
# Catch-all for unmatched requests (put last)
responses:
  - id: 'fallback'
    messages:
      - role: 'user'
        content: '.*' # Matches anything
        matcher: 'regex'
      - role: 'assistant'
        content: 'I did not understand that request.'

  # Flexible conversation starter
  - id: 'any-user-message'
    messages:
      - role: 'user'
        matcher: 'any'
      - role: 'assistant'
        content: 'Thanks for your message!'
```

### Error Handling

Invalid regex patterns are logged and treated as non-matches:

```yaml
# This will log a warning and never match
responses:
  - id: 'invalid-regex'
    messages:
      - role: 'user'
        content: '[invalid regex'
        matcher: 'regex'
      - role: 'assistant'
        content: 'This will never match!'
```

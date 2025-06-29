---
title: Matcher Types
description: Learn about the different message matching strategies available
---

# Matcher Types

OpenAI Mock API supports four different matching strategies, each with optional inversion capabilities.

## Exact Match

Matches messages exactly as specified, including whitespace (trimmed).

```yaml
matcher:
  type: "exact"
  messages:
    - role: "user"
      content: "Hello, how are you?"
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
matcher:
  type: "fuzzy"
  threshold: 0.8  # 0.0 to 1.0, higher = more similar required
  messages:
    - role: "user"
      content: "I need help with something"
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
matcher:
  type: "regex"
  messages:
    - role: "user"
      content: ".*code.*python.*"  # Contains "code" and "python"
```

**Features:**
- Case-insensitive by default
- Full JavaScript regex syntax support
- Powerful pattern matching capabilities

**Examples:**
```yaml
# Match any code-related question
- content: ".*(code|programming|script).*"

# Match specific patterns
- content: "^(hello|hi|hey)\\s+.*"  # Starts with greeting

# Match numbers
- content: ".*\\d+.*"  # Contains any number

# Match email-like patterns  
- content: ".*@.*\\..*"  # Contains @ and . (simplified email)
```

**Use cases:**
- Pattern-based matching
- Complex conditional logic
- Flexible content validation

## Contains Match

Matches messages that contain the specified substring (case-insensitive).

```yaml
matcher:
  type: "contains"
  messages:
    - role: "user"
      content: "weather"  # Matches any message containing "weather"
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

## Inverted Matching

Any matcher type can be inverted using the `invert` parameter:

```yaml
matcher:
  type: "contains"
  invert: true  # Matches when the condition FAILS
  messages:
    - role: "user"
      content: "debug"
```

**How it works:**
1. The base matcher is evaluated normally
2. If `invert: true`, the result is flipped
3. `true` becomes `false`, `false` becomes `true`

**Examples:**

### Inverted Contains
```yaml
# Matches messages that DON'T contain "admin"
matcher:
  type: "contains"
  invert: true
  messages:
    - role: "user"
      content: "admin"
```

### Inverted Exact
```yaml
# Matches any message EXCEPT the exact phrase
matcher:
  type: "exact"
  invert: true
  messages:
    - role: "user"
      content: "skip this"
```

### Inverted Fuzzy
```yaml
# Matches messages that are NOT similar to the pattern
matcher:
  type: "fuzzy"
  threshold: 0.8
  invert: true
  messages:
    - role: "user"
      content: "technical support question"
```

### Inverted Regex
```yaml
# Matches messages that DON'T match the pattern
matcher:
  type: "regex"
  invert: true
  messages:
    - role: "user"
      content: "^(yes|no|maybe)$"  # Not a simple yes/no answer
```

## Multi-Message Matching

All matchers support multi-message conversations:

```yaml
matcher:
  type: "exact"
  messages:
    - role: "system"
      content: "You are a helpful assistant."
    - role: "user"
      content: "Hello"
    - role: "assistant"
      content: "Hi there!"
    - role: "user"
      content: "How are you?"
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
- id: "fallback"
  matcher:
    type: "regex"
    messages:
      - role: "user"
        content: ".*"  # Matches anything
  response:
    # ... error or default response

# Skip system messages
- id: "user-only"
  matcher:
    type: "contains"
    invert: true
    messages:
      - role: "system"
        content: ""
  # This won't work as intended - better to structure your config differently
```

### Error Handling

Invalid regex patterns are logged and treated as non-matches:

```yaml
# This will log a warning and never match
matcher:
  type: "regex"
  messages:
    - role: "user"
      content: "[invalid regex"
```
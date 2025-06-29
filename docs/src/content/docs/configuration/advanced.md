---
title: Advanced Features
description: Advanced configuration options and features
---

# Advanced Features

Explore advanced configuration patterns and features for complex testing scenarios.

## Response Ordering and Priority

Responses are evaluated in the order they appear in your configuration file. The first matching response is used.

```yaml
responses:
  # Specific cases first
  - id: "python-help-specific"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Help me with Python debugging"
    response:
      # ... specific debugging response

  # General cases later
  - id: "python-help-general"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "Python"
    response:
      # ... general Python response

  # Catch-all at the end
  - id: "fallback"
    matcher:
      type: "regex"
      messages:
        - role: "user"
          content: ".*"
    response:
      # ... default response
```

## Complex Message Patterns

### Multi-Turn Conversations

Match complete conversation flows:

```yaml
- id: "booking-flow"
  matcher:
    type: "exact"
    messages:
      - role: "system"
        content: "You are a booking assistant."
      - role: "user"
        content: "I want to book a table"
      - role: "assistant"
        content: "How many people?"
      - role: "user"
        content: "4 people"
  response:
    # ... booking confirmation response
```

### Role-Specific Matching

Target specific conversation roles:

```yaml
# Only match user messages (no system/assistant)
- id: "user-only"
  matcher:
    type: "contains"  
    messages:
      - role: "user"
        content: "help"
  response:
    # ... response

# Match system prompts
- id: "system-prompt"
  matcher:
    type: "regex"
    messages:
      - role: "system"
        content: "You are a .* assistant"
  response:
    # ... acknowledgment response
```

## Advanced Matcher Combinations

### Inverted Matching Patterns

Create sophisticated logic with inverted matchers:

```yaml
# Handle everything EXCEPT admin requests
- id: "non-admin-requests"
  matcher:
    type: "contains"
    invert: true
    messages:
      - role: "user"
        content: "admin"
  response:
    id: "chatcmpl-normal"
    # ... normal user response

# Match requests that DON'T contain swear words
- id: "clean-requests"
  matcher:
    type: "regex"
    invert: true
    messages:
      - role: "user"
        content: ".*(damn|hell|crap).*"
  response:
    # ... normal response
```

### Fuzzy Matching Strategies

Fine-tune fuzzy matching for different use cases:

```yaml
# Very strict fuzzy matching
- id: "precise-help"
  matcher:
    type: "fuzzy"
    threshold: 0.9  # 90% similarity required
    messages:
      - role: "user"
        content: "I need technical support"
  response:
    # ... precise technical response

# Lenient fuzzy matching
- id: "general-help"
  matcher:
    type: "fuzzy"  
    threshold: 0.5  # 50% similarity sufficient
    messages:
      - role: "user"
        content: "help"
  response:
    # ... general help response
```

### Complex Regex Patterns

Use advanced regex for sophisticated matching:

```yaml
# Match different greeting patterns
- id: "greetings"
  matcher:
    type: "regex"
    messages:
      - role: "user"
        content: "^(hello|hi|hey|greetings?)\\b.*"
  response:
    # ... greeting response

# Match questions with specific structure
- id: "how-to-questions"
  matcher:
    type: "regex"
    messages:
      - role: "user"
        content: "how (do|can|to) (i|you) .+"
  response:
    # ... how-to response

# Match code-related requests
- id: "code-requests"
  matcher:
    type: "regex"
    messages:
      - role: "user"
        content: ".*(code|programming|script|function|class|debug|error).*"
  response:
    # ... code help response
```

## Environment-Specific Configuration

### Using Environment Variables

Reference environment variables in your configuration:

```yaml
apiKey: "${MOCK_API_KEY:-default-test-key}"
port: "${MOCK_PORT:-3000}"

responses:
  - id: "environment-aware"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "environment"
    response:
      id: "chatcmpl-env"
      object: "chat.completion"
      created: 1677649420
      model: "${MODEL_NAME:-gpt-3.5-turbo}"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Running in ${NODE_ENV:-development} mode"
          finish_reason: "stop"
      usage:
        prompt_tokens: 5
        completion_tokens: 8
        total_tokens: 13
```

### Configuration Templates

Use YAML anchors for reusable configuration blocks:

```yaml
# Define reusable templates
templates:
  default_response: &default_response
    object: "chat.completion"
    created: 1677649420
    model: "gpt-3.5-turbo"
    
  default_usage: &default_usage
    prompt_tokens: 10
    completion_tokens: 15
    total_tokens: 25

apiKey: "test-key"
responses:
  - id: "greeting"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Hello"
    response:
      <<: *default_response
      id: "chatcmpl-greeting"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "Hello there!"
          finish_reason: "stop"
      usage:
        <<: *default_usage
        completion_tokens: 5
        total_tokens: 15
```

## Testing Strategies

### Layered Response Configuration

Structure responses from specific to general:

```yaml
responses:
  # Layer 1: Exact matches for critical paths
  - id: "critical-exact"
    matcher:
      type: "exact"
      messages:
        - role: "user"
          content: "Delete my account permanently"
    response:
      # ... confirmation response
      
  # Layer 2: Contains matches for categories  
  - id: "account-related"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "account"
    response:
      # ... general account help
      
  # Layer 3: Fuzzy matches for variations
  - id: "help-variations"
    matcher:
      type: "fuzzy"
      threshold: 0.7
      messages:
        - role: "user"
          content: "I need assistance"
    response:
      # ... assistance response
      
  # Layer 4: Regex catch-alls
  - id: "question-patterns"
    matcher:
      type: "regex"
      messages:
        - role: "user"
          content: ".*\\?$"  # Ends with question mark
    response:
      # ... generic question response
```

### Error Simulation

Create responses that simulate API errors:

```yaml
- id: "rate-limit-simulation"
  matcher:
    type: "contains"
    messages:
      - role: "user"
        content: "rate limit test"
  response:
    # This would be handled by the server's error system
    # But shown here for illustration
    id: "chatcmpl-error"
    object: "chat.completion"
    created: 1677649420
    model: "gpt-3.5-turbo"
    choices:
      - index: 0
        message:
          role: "assistant"
          content: "I'm experiencing high load. Please try again."
        finish_reason: "stop"
    usage:
      prompt_tokens: 8
      completion_tokens: 12
      total_tokens: 20
```

## Performance Optimization

### Matcher Performance

Order matchers by performance characteristics:

1. **Exact** (fastest) - Use for known, fixed inputs
2. **Contains** (fast) - Use for keyword matching  
3. **Regex** (moderate) - Use for pattern matching
4. **Fuzzy** (slowest) - Use sparingly for similarity

```yaml
responses:
  # Fast exact matches first
  - id: "exact-commands"
    matcher:
      type: "exact"
      # ...
      
  # Fast contains matches  
  - id: "keyword-routing"
    matcher:
      type: "contains"
      # ...
      
  # Moderate regex matches
  - id: "pattern-matching"
    matcher:
      type: "regex"
      # ...
      
  # Slow fuzzy matches last
  - id: "similarity-matching"
    matcher:
      type: "fuzzy"
      # ...
```

### Large Configuration Management

Split large configurations across multiple files:

```bash
# config/
#   main.yaml
#   responses/
#     greetings.yaml
#     help.yaml
#     errors.yaml
```

```yaml
# main.yaml
apiKey: "test-key"
port: 3000

responses:
  # Include other files (manual process)
  # You'll need to manually combine them
```

## Debugging and Logging

### Verbose Logging

Enable detailed logging for debugging:

```bash
npx openai-mock-api --config config.yaml --verbose
```

### Response Identification

Use descriptive IDs to trace which responses are triggered:

```yaml
- id: "user-greeting-formal-morning"  # Very specific
- id: "help-python-debugging"         # Category-specific  
- id: "fallback-unmatched-request"    # Fallback identifier
```

This helps in logs to understand which response was matched.
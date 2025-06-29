---
title: Introduction
description: A mock OpenAI API server for testing LLM applications
---

# Introduction

OpenAI API Mock is a mock server that mimics the OpenAI API. It returns configurable responses based on message patterns you define, making LLM application testing predictable and repeatable.

## What it looks like

```yaml
# config.yaml
apiKey: "test-key"
port: 3000
responses:
  - id: "greeting"
    matcher:
      type: "contains"
      pattern: "hello"
    response:
      content: "Hello! How can I help you today?"
```

```javascript
// Your test code
const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'test-key'
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Say hello!' }]
});
// Returns: "Hello! How can I help you today?"
```

## Why use it

Testing LLM applications is hard because:
- Real API responses vary each time
- API calls cost money and have rate limits
- Network issues can break tests
- You can't test specific edge cases reliably

This mock server solves these issues by giving you complete control over responses during testing.
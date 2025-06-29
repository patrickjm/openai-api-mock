---
title: Introduction
description: Learn about OpenAI API Mock and why you should use it for testing LLM applications
---

# Introduction

OpenAI API Mock is a powerful tool for testing LLM applications without the unpredictability and cost of real API calls. It provides a mock OpenAI API server that returns configurable, predictable responses based on your input patterns.

## Why Use OpenAI API Mock?

### 🔬 **Deterministic Testing**
Traditional LLM testing is challenging because responses vary. With OpenAI API Mock, you define exact responses for specific inputs, making your tests reliable and repeatable.

### 💰 **Cost Effective**
Avoid API costs during development and testing. Run unlimited tests without worrying about token usage or rate limits.

### ⚡ **Fast Development**
No network latency or API downtime issues. Your tests run instantly with consistent performance.

### 🎯 **Precise Control**
Test edge cases, error conditions, and specific response formats that would be difficult to reproduce with a real API.

## How It Works

1. **Define Patterns**: Create YAML configuration files that specify message patterns and their corresponding responses
2. **Start Server**: Run the mock server locally or in your CI/CD environment  
3. **Point Your App**: Configure your OpenAI client to use the mock server's URL
4. **Test Away**: Your application receives predictable responses based on your configuration

## Use Cases

- **Unit Testing**: Test individual components with known inputs and outputs
- **Integration Testing**: Verify your application handles various response formats correctly
- **Development**: Build features without consuming API tokens
- **CI/CD**: Run automated tests without external dependencies
- **Demo/Staging**: Provide consistent behavior for demonstrations

## What Makes It Special

Unlike simple mock frameworks, OpenAI API Mock provides:

- **Multiple Matching Strategies**: Exact, fuzzy, regex, and substring matching
- **Response Inversion**: Match when patterns DON'T match
- **Streaming Support**: Full Server-Sent Events compatibility
- **OpenAI Compatibility**: Drop-in replacement with proper error handling
- **TypeScript Support**: Full type safety and IDE integration
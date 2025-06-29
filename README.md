# OpenAI API Mock

A mock OpenAI API server for testing LLM applications. This tool allows you to define predictable responses to specific message patterns, making it easier to test your AI-powered applications without the variability of real LLM responses.

## Features

- 🔄 **NPX runnable** - Use directly with `npx openai-api-mock`
- 📝 **YAML configuration** - Define responses with simple YAML files
- 🎯 **Multiple matching strategies** - Exact, fuzzy, regex, and contains message matching
- 🔒 **API key validation** - Secure your mock API with custom keys
- 📊 **OpenAI-compatible** - Drop-in replacement for OpenAI API endpoints
- 🌊 **Streaming support** - Full SSE streaming compatibility
- 🪵 **Flexible logging** - Log to file or stdout with configurable verbosity
- ⚡ **TypeScript first** - Written in TypeScript with full type safety

## Installation

```bash
npm install -g openai-api-mock
```

Or use directly with npx:

```bash
npx openai-api-mock --config config.yaml
```

## Usage

### Basic Usage

1. Create a configuration file (`config.yaml`):

```yaml
apiKey: "your-test-api-key"
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

2. Start the mock server:

```bash
npx openai-api-mock --config config.yaml --port 3000
```

3. Use with your OpenAI client:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your-test-api-key',
  baseURL: 'http://localhost:3000/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
});
```

### CLI Options

```bash
npx openai-api-mock [options]

Options:
  -c, --config <path>      Path to YAML configuration file (required)
  -p, --port <number>      Port to run the server on (default: 3000)
  -l, --log-file <path>    Path to log file (defaults to stdout)
  -v, --verbose            Enable verbose logging
  -h, --help              Display help for command
```

## Configuration

### Matcher Types

#### Exact Match
Matches messages exactly as specified:

```yaml
matcher:
  type: "exact"
  messages:
    - role: "user"
      content: "Hello, how are you?"
```

#### Fuzzy Match
Matches messages with similarity scoring:

```yaml
matcher:
  type: "fuzzy"
  threshold: 0.8  # 0.0-1.0, higher = more similar required
  messages:
    - role: "user"
      content: "I need help with something"
```

#### Regex Match
Matches messages using regular expressions:

```yaml
matcher:
  type: "regex"
  messages:
    - role: "user"
      content: ".*code.*python.*"  # Matches any message containing "code" and "python"
```

#### Contains Match
Matches messages that contain the specified substring (case-insensitive):

```yaml
matcher:
  type: "contains"
  messages:
    - role: "user"
      content: "weather"  # Matches any message containing "weather"
```

#### Inverted Matching
Any matcher type can be inverted using the `invert` parameter to match when the condition fails:

```yaml
matcher:
  type: "contains"
  invert: true  # Matches messages that DON'T contain the substring
  messages:
    - role: "user"
      content: "debug"  # Matches any message that doesn't contain "debug"
```

### Full Configuration Example

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
      id: "chatcmpl-example1"
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

  - id: "help-request"
    matcher:
      type: "fuzzy"
      threshold: 0.7
      messages:
        - role: "user"
          content: "I need help"
    response:
      id: "chatcmpl-example2"
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

  - id: "weather-info"
    matcher:
      type: "contains"
      messages:
        - role: "user"
          content: "weather"
    response:
      id: "chatcmpl-example3"
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
        prompt_tokens: 10
        completion_tokens: 8
        total_tokens: 18

  - id: "non-debug-requests"
    matcher:
      type: "contains"
      invert: true
      messages:
        - role: "user"
          content: "debug"
    response:
      id: "chatcmpl-example4"
      object: "chat.completion"
      created: 1677649420
      model: "gpt-3.5-turbo"
      choices:
        - index: 0
          message:
            role: "assistant"
            content: "This matches messages that don't contain 'debug'!"
          finish_reason: "stop"
      usage:
        prompt_tokens: 12
        completion_tokens: 10
        total_tokens: 22
```

## Supported Endpoints

- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completions (with streaming support)
- `GET /health` - Health check endpoint

## Streaming Support

The mock server supports Server-Sent Events (SSE) streaming just like the real OpenAI API:

```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## Error Handling

The mock server returns OpenAI-compatible error responses:

- `401 Unauthorized` - Invalid or missing API key
- `400 Bad Request` - Invalid request format or no matching response
- `404 Not Found` - Unsupported endpoint
- `500 Internal Server Error` - Server errors

## Development

### Setup

```bash
git clone <repository>
cd openai-api-mock
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Development Mode

```bash
npm run dev -- --config example-config.yaml
```

## Documentation

For comprehensive documentation, visit our [documentation site](https://patrickjm.github.io/openai-api-mock).

The documentation includes:
- **Getting Started**: Quick setup and installation guides
- **Configuration**: Detailed matcher types and response configuration
- **Guides**: Testing patterns, streaming, error handling, and integration examples
- **API Reference**: CLI options and configuration reference

### Local Documentation Development

To work on the documentation locally:

```bash
# Install docs dependencies
npm run docs:install

# Start development server
npm run docs:dev

# Build documentation
npm run docs:build

# Preview built docs
npm run docs:preview
```

## License

MIT License - see LICENSE file for details.
# OpenAI Mock API

![npm](https://img.shields.io/npm/v/openai-mock-api)

A mock OpenAI API server for testing LLM applications. This tool allows you to define predictable responses to specific message patterns, making it easier to test your AI-powered applications without the variability of real LLM responses.

## Features

- 🔄 **NPX runnable** - Use directly with `npx openai-mock-api`
- 📝 **YAML configuration** - Define responses with simple conversation flows
- 🎯 **Multiple matching strategies** - Exact, fuzzy, regex, contains, and any message matching
- 🔄 **Conversation flows** - Define complete conversation patterns with automatic partial matching
- 🛠️ **Tool call support** - Full support for OpenAI function/tool calls
- 🔒 **API key validation** - Secure your mock API with custom keys
- 📊 **OpenAI-compatible** - Drop-in replacement for OpenAI API endpoints
- 🌊 **Streaming support** - Full SSE streaming compatibility
- 🧮 **Automatic token calculation** - Real token counts using tiktoken library
- 🪵 **Flexible logging** - Log to file or stdout with configurable verbosity
- ⚡ **TypeScript first** - Written in TypeScript with full type safety

## Installation

```bash
npm install -g openai-mock-api
```

Or use directly with npx:

```bash
npx openai-mock-api --config config.yaml
```

## Usage

### Basic Usage

1. Create a configuration file (`config.yaml`):

```yaml
apiKey: "your-test-api-key"
port: 3000
responses:
  - id: "greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "Hello! I'm doing well, thank you for asking."
```

2. Start the mock server:

```bash
npx openai-mock-api --config config.yaml --port 3000
```

Or use stdin for configuration:

```bash
cat config.yaml | npx openai-mock-api
# or
npx openai-mock-api < config.yaml
# or explicitly with -
npx openai-mock-api --config -
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
npx openai-mock-api [options]

Options:
  -c, --config <path>      Path to YAML configuration file (required)
  -p, --port <number>      Port to run the server on (default: 3000)
  -l, --log-file <path>    Path to log file (defaults to stdout)
  -v, --verbose            Enable verbose logging
  -h, --help              Display help for command
```

## Configuration

The configuration format is conversation-first, where each response is defined as a complete conversation flow. The last assistant message in the flow is used as the response.

### Matcher Types

#### Exact Match (Default)
Messages are matched exactly as specified. This is the default behavior when no `matcher` field is provided:

```yaml
responses:
  - id: "greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "Hello! I'm doing well, thank you for asking."
```

#### Fuzzy Match
Matches messages with similarity scoring:

```yaml
responses:
  - id: "help-request"
    messages:
      - role: "user"
        content: "I need help with something"
        matcher: "fuzzy"
        threshold: 0.8  # 0.0-1.0, higher = more similar required
      - role: "assistant"
        content: "I'd be happy to help!"
```

#### Regex Match
Matches messages using regular expressions:

```yaml
responses:
  - id: "code-request"
    messages:
      - role: "user"
        content: ".*code.*python.*"  # Matches any message containing "code" and "python"
        matcher: "regex"
      - role: "assistant"
        content: "Here's some Python code for you!"
```

#### Contains Match
Matches messages that contain the specified substring (case-insensitive):

```yaml
responses:
  - id: "weather-info"
    messages:
      - role: "user"
        content: "weather"  # Matches any message containing "weather"
        matcher: "contains"
      - role: "assistant"
        content: "The weather is nice today!"
```

#### Any Match
Matches any message of the specified role, enabling flexible conversation flows:

```yaml
responses:
  - id: "flexible-flow"
    messages:
      - role: "user"
        matcher: "any"  # No content field needed
      - role: "assistant"
        content: "Thanks for your message!"
```

### Conversation Flows and Partial Matching

All responses support **partial conversation matching**. If the incoming conversation matches the beginning of a conversation flow, it will return the final assistant response:

```yaml
responses:
  - id: "conversation-flow"
    messages:
      - role: "user"
        content: "Start conversation"
      - role: "assistant"
        content: "Hello! How can I help you?"
      - role: "user"
        content: "Tell me about the weather"
      - role: "assistant"
        content: "The weather is sunny today!"
```

This will match:
- Just `["Start conversation"]` → Returns: `"The weather is sunny today!"`
- `["Start conversation", "Hello! How can I help you?"]` → Returns: `"The weather is sunny today!"`
- Full 3-message conversation → Returns: `"The weather is sunny today!"`

### Tool Calls

The configuration format supports OpenAI tool calls in conversation flows:

```yaml
responses:
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

### Full Configuration Example

```yaml
apiKey: "test-api-key-12345"
port: 3000
responses:
  - id: "greeting"
    messages:
      - role: "user"
        content: "Hello, how are you?"
      - role: "assistant"
        content: "Hello! I'm doing well, thank you for asking."

  - id: "help-request"
    messages:
      - role: "user"
        content: "I need help"
        matcher: "fuzzy"
        threshold: 0.7
      - role: "assistant"
        content: "I'd be happy to help! What do you need assistance with?"

  - id: "weather-info"
    messages:
      - role: "user"
        content: "weather"
        matcher: "contains"
      - role: "assistant"
        content: "The weather is nice today!"

  - id: "complex-conversation"
    messages:
      - role: "system"
        matcher: "any"
      - role: "user"
        content: ".*help.*"
        matcher: "regex"
      - role: "assistant"
        content: "How can I assist you today?"
      - role: "user"
        matcher: "any"
      - role: "assistant"
        content: "Thanks for using our service!"
```

## Token Calculation

The mock server automatically calculates token counts for all responses using OpenAI's tiktoken library. Token usage is included in every response:

```json
{
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 12,
    "total_tokens": 27
  }
}
```

- **Prompt tokens**: Calculated from the input messages
- **Completion tokens**: Calculated from the response content  
- **Total tokens**: Sum of prompt and completion tokens

For simplicity in the mock environment, all calculations use the `cl100k_base` tokenizer regardless of the specified model.

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
cd openai-mock-api
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

For comprehensive documentation, visit our [documentation site](https://patrickjm.github.io/openai-mock-api).

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
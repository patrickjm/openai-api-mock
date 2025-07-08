---
title: CLI Options
description: Command-line interface reference for OpenAI Mock API
---

# CLI Options

Complete reference for the `openai-mock-api` command-line interface.

## Synopsis

```bash
openai-mock-api [options]
```

## Configuration Options

### `-c, --config <path>`

Path to the YAML configuration file. Use `-` to read from stdin.

```bash
# From file
openai-mock-api --config config.yaml
openai-mock-api -c /path/to/config.yaml

# From stdin
cat config.yaml | openai-mock-api --config -
openai-mock-api --config - < config.yaml

# Without --config flag (defaults to stdin)
cat config.yaml | openai-mock-api
```

The configuration must be a valid YAML containing your API key, responses, and other settings. If no config option is provided, the tool will attempt to read from stdin.

## Optional Options

### `-p, --port <number>`

Port number to run the server on. Defaults to `3000`.

```bash
openai-mock-api --config config.yaml --port 8080
openai-mock-api -c config.yaml -p 8080
```

If both the CLI option and config file specify a port, the CLI option takes precedence.

### `-l, --log-file <path>`

Path to a log file. If not specified, logs are written to stdout.

```bash
openai-mock-api --config config.yaml --log-file server.log
openai-mock-api -c config.yaml -l /var/log/openai-mock.log
```

The log file will be created if it doesn't exist. The directory must exist.

### `-v, --verbose`

Enable verbose logging. Shows debug-level information including:

- Request details
- Matcher evaluation process
- Response selection logic
- Timing information

```bash
openai-mock-api --config config.yaml --verbose
openai-mock-api -c config.yaml -v
```

### `-h, --help`

Display help information and exit.

```bash
openai-mock-api --help
openai-mock-api -h
```

### `--version`

Display version information and exit.

```bash
openai-mock-api --version
```

## Examples

### Basic Usage

```bash
# Minimal setup
openai-mock-api --config config.yaml

# From stdin
cat config.yaml | openai-mock-api

# Custom port
openai-mock-api --config config.yaml --port 3001

# With logging
openai-mock-api --config config.yaml --log-file api.log

# Verbose mode for debugging
openai-mock-api --config config.yaml --verbose

# All options combined
openai-mock-api \
  --config config.yaml \
  --port 3001 \
  --log-file api.log \
  --verbose
```

### Development Usage

```bash
# Start with verbose logging for development
openai-mock-api -c dev-config.yaml -v

# Use a different port to avoid conflicts
openai-mock-api -c config.yaml -p 3001

# Log to a specific file for debugging
openai-mock-api -c config.yaml -l debug.log -v

# Quick test with inline config
echo 'apiKey: test-key
port: 3000
responses:
  - id: test
    messages:
      - role: user
        content: Hello
      - role: assistant
        content: Hi!' | openai-mock-api -v
```

### Production Usage

```bash
# Production with specific port and logging
openai-mock-api \
  --config production-config.yaml \
  --port 8080 \
  --log-file /var/log/openai-mock.log

# Using environment variables
PORT=8080 LOG_FILE=/var/log/api.log openai-mock-api -c config.yaml
```

## Configuration File Priority

Settings are applied in this order (later options override earlier ones):

1. Configuration file values
2. Environment variables
3. Command-line options

```yaml
# config.yaml
port: 3000
```

```bash
# This will run on port 8080, not 3000
openai-mock-api --config config.yaml --port 8080
```

## Environment Variables

While not directly supported by CLI options, you can use environment variables in your shell:

```bash
# Set defaults via environment
export OPENAI_MOCK_PORT=3001
export OPENAI_MOCK_CONFIG=config.yaml

# Use in commands
openai-mock-api --config "$OPENAI_MOCK_CONFIG" --port "$OPENAI_MOCK_PORT"
```

## Exit Codes

| Code | Description                                   |
| ---- | --------------------------------------------- |
| 0    | Success                                       |
| 1    | Configuration error or server startup failure |
| 2    | Invalid command-line arguments                |
| 130  | Interrupted (Ctrl+C)                          |

## Troubleshooting

### Common Issues

**"Configuration file not found"**

```bash
# Check the path
ls -la config.yaml

# Use absolute path
openai-mock-api --config /full/path/to/config.yaml
```

**"Port already in use"**

```bash
# Check what's using the port
lsof -i :3000

# Use a different port
openai-mock-api --config config.yaml --port 3001
```

**"Permission denied" for log file**

```bash
# Check directory permissions
ls -la /var/log/

# Use a writable location
openai-mock-api --config config.yaml --log-file ./api.log
```

### Debug Information

Use verbose mode to get detailed information:

```bash
openai-mock-api --config config.yaml --verbose
```

This will show:

- Configuration loading process
- Server startup details
- Request processing information
- Matcher evaluation steps

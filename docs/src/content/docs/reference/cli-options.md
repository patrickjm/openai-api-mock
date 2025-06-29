---
title: CLI Options
description: Command-line interface reference for OpenAI API Mock
---

# CLI Options

Complete reference for the `openai-api-mock` command-line interface.

## Synopsis

```bash
openai-api-mock [options]
```

## Required Options

### `-c, --config <path>`

**Required** - Path to the YAML configuration file.

```bash
openai-api-mock --config config.yaml
openai-api-mock -c /path/to/config.yaml
```

The configuration file must be a valid YAML file containing your API key, responses, and other settings.

## Optional Options

### `-p, --port <number>`

Port number to run the server on. Defaults to `3000`.

```bash
openai-api-mock --config config.yaml --port 8080
openai-api-mock -c config.yaml -p 8080
```

If both the CLI option and config file specify a port, the CLI option takes precedence.

### `-l, --log-file <path>`

Path to a log file. If not specified, logs are written to stdout.

```bash
openai-api-mock --config config.yaml --log-file server.log
openai-api-mock -c config.yaml -l /var/log/openai-mock.log
```

The log file will be created if it doesn't exist. The directory must exist.

### `-v, --verbose`

Enable verbose logging. Shows debug-level information including:
- Request details
- Matcher evaluation process
- Response selection logic
- Timing information

```bash
openai-api-mock --config config.yaml --verbose
openai-api-mock -c config.yaml -v
```

### `-h, --help`

Display help information and exit.

```bash
openai-api-mock --help
openai-api-mock -h
```

### `--version`

Display version information and exit.

```bash
openai-api-mock --version
```

## Examples

### Basic Usage

```bash
# Minimal setup
openai-api-mock --config config.yaml

# Custom port
openai-api-mock --config config.yaml --port 3001

# With logging
openai-api-mock --config config.yaml --log-file api.log

# Verbose mode for debugging
openai-api-mock --config config.yaml --verbose

# All options combined
openai-api-mock \
  --config config.yaml \
  --port 3001 \
  --log-file api.log \
  --verbose
```

### Development Usage

```bash
# Start with verbose logging for development
openai-api-mock -c dev-config.yaml -v

# Use a different port to avoid conflicts
openai-api-mock -c config.yaml -p 3001

# Log to a specific file for debugging
openai-api-mock -c config.yaml -l debug.log -v
```

### Production Usage

```bash
# Production with specific port and logging
openai-api-mock \
  --config production-config.yaml \
  --port 8080 \
  --log-file /var/log/openai-mock.log

# Using environment variables
PORT=8080 LOG_FILE=/var/log/api.log openai-api-mock -c config.yaml
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
openai-api-mock --config config.yaml --port 8080
```

## Environment Variables

While not directly supported by CLI options, you can use environment variables in your shell:

```bash
# Set defaults via environment
export OPENAI_MOCK_PORT=3001
export OPENAI_MOCK_CONFIG=config.yaml

# Use in commands
openai-api-mock --config "$OPENAI_MOCK_CONFIG" --port "$OPENAI_MOCK_PORT"
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0    | Success |
| 1    | Configuration error or server startup failure |
| 2    | Invalid command-line arguments |
| 130  | Interrupted (Ctrl+C) |

## Troubleshooting

### Common Issues

**"Configuration file not found"**
```bash
# Check the path
ls -la config.yaml

# Use absolute path
openai-api-mock --config /full/path/to/config.yaml
```

**"Port already in use"**
```bash
# Check what's using the port
lsof -i :3000

# Use a different port
openai-api-mock --config config.yaml --port 3001
```

**"Permission denied" for log file**
```bash
# Check directory permissions
ls -la /var/log/

# Use a writable location
openai-api-mock --config config.yaml --log-file ./api.log
```

### Debug Information

Use verbose mode to get detailed information:

```bash
openai-api-mock --config config.yaml --verbose
```

This will show:
- Configuration loading process
- Server startup details
- Request processing information
- Matcher evaluation steps
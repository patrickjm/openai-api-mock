---
title: Installation
description: Different ways to install and use OpenAI API Mock
---

# Installation

OpenAI API Mock can be used in several ways depending on your needs.

## NPX (Recommended)

The fastest way to get started - no installation required:

```bash
npx openai-api-mock --config config.yaml
```

This downloads and runs the latest version directly. Perfect for:
- Quick testing and prototyping
- CI/CD environments
- One-off usage

## Global Installation

Install globally to use the `openai-api-mock` command anywhere:

```bash
npm install -g openai-api-mock
openai-api-mock --config config.yaml
```

## Local Installation

Add to your project as a development dependency:

```bash
# npm
npm install --save-dev openai-api-mock

# yarn
yarn add --dev openai-api-mock

# pnpm
pnpm add --save-dev openai-api-mock
```

Then use via npm scripts in `package.json`:

```json
{
  "scripts": {
    "mock-api": "openai-api-mock --config test-config.yaml",
    "test:integration": "openai-api-mock --config test-config.yaml & npm run test && pkill -f openai-api-mock"
  }
}
```

## Docker Usage

Create a Dockerfile for containerized usage:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g openai-api-mock
COPY config.yaml ./
EXPOSE 3000
CMD ["openai-api-mock", "--config", "config.yaml"]
```

Or use with docker-compose:

```yaml
# docker-compose.yml
version: '3.8'
services:
  openai-mock:
    image: node:18-alpine
    command: sh -c "npm install -g openai-api-mock && openai-api-mock --config /config/config.yaml"
    ports:
      - "3000:3000"
    volumes:
      - ./config.yaml:/config/config.yaml
```

## Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm/yarn/pnpm**: Any modern package manager

## Verification

Verify your installation:

```bash
# Check version
openai-api-mock --version

# View help
openai-api-mock --help
```

## Development Setup

If you want to contribute or modify the source:

```bash
# Clone the repository
git clone https://github.com/patrickjm/openai-api-mock.git
cd openai-api-mock

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start in development mode
npm run dev -- --config example-config.yaml
```

## Troubleshooting

### Command Not Found
If you get "command not found" after global installation:
- Ensure npm's global bin directory is in your PATH
- Try `npm list -g openai-api-mock` to verify installation

### Permission Issues
On Unix systems, you might need sudo for global installation:
```bash
sudo npm install -g openai-api-mock
```

Or use a Node version manager like nvm to avoid permission issues.

### Port Already in Use
If port 3000 is busy:
```bash
openai-api-mock --config config.yaml --port 3001
```

Or specify port in your config file:
```yaml
port: 3001
# ... rest of config
```
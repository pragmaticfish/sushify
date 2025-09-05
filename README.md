# 🍣 Sushify

**"Turn your prompt salad into sushi"** 🥗 → 🍣

Sushify is a development tool that runs on your local machine, wraps your AI app, and automatically captures and analyzes every LLM API call in your application - catching issues that can cause unpredictable behaviors and bad outputs.

The best part? No code changes needed. No complex configuration files (actually no configuration files at all!).
It supports any app (including dockerized) that can be proxied, regardless of programming language or LLM provider.

**You can set it up in ~5 minutes**.

TODO - ADD GIF OF DASHBOARD HERE

## Who? When? Why? How?

- **Who is Sushify for?** Developers building AI applications
- **When?** During development. Sushify runs on your localhost.
- **Why?** Because we pass tons of free text to LLMs, usually made out of fragments, sometimes involving conditional logic. System prompts, tool descriptions, output schemas - sometimes thousands of tokens that evolve over time. There is no compiler, no linter. It's all free text. And we haven't even started talking about context management bugs. How many times has your app started misbehaving and after a lot of digging you realized that it's because you (or someone else) messed up some of the instructions? No more!
- **How?** Sushify runs a proxy that wraps your app and intercepts network requests and responses to LLMs. Each exchange is sent to OpenAI for analysis using your API key. The analysis results are displayed on a dashboard that runs locally on your machine, highlighting issues and suggesting fixes.

## 🚀 Quick Start

### Prerequisites

- **[Node.js](https://nodejs.org/en/download)** version ^20.19 || ^22.12 || >=24
  - **Recommended: v24.0.0+** for best AI application proxy support
- **[Python 3.8+](https://www.python.org/downloads/)** with pip (for HTTP proxy functionality)
  - **Note:** Command `python3` must be available (even if `python` points to Python 2.7)
- **[OpenAI API Key](https://platform.openai.com/api-keys)** (optional, for prompt analysis)

### Install Sushify

```bash
npm install -g sushify
```

### One-time Setup

Run the setup command to configure dependencies:

```bash
sushify setup
```

This will automatically:

- ✅ Check for Python 3.8+ and Node.js requirements
- ✅ Install mitmproxy (HTTP proxy for traffic capture)
- ✅ Install HTTPS certificate (one-time setup)
- ✅ Provide step-by-step guidance if any issues

**Note:** You will be prompted for your password to install the HTTPS certificate.

### Configure Your Environment

#### Set Your OpenAI API Key (Required for Analysis)

The whole point of Sushify is to analyze your prompts for quality issues. Set your OpenAI API key to enable this:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or add it to your shell profile for persistence:

```bash
echo 'export OPENAI_API_KEY=sk-your-key-here' >> ~/.zshrc
source ~/.zshrc
```

**Cost:** the analysis is currently done by Open AI's o3 - which is quite cheap.

#### Analysis Mode (Optional)

Sushify supports two analysis modes:

- **Deep mode** (default): Runs multiple LLM calls per analysis for thorough prompt quality checking
- **Cheap mode**: Uses a single LLM call per analysis for faster, more cost-effective analysis

```bash
# Switch to cheap mode for faster analysis
export ANALYSIS_MODE=cheap

# Switch back to deep mode (or unset the variable)
export ANALYSIS_MODE=deep
# OR
unset ANALYSIS_MODE
```

The current analysis mode is displayed in the dashboard. You can switch modes anytime by changing the environment variable and restarting Sushify.

#### Custom LLM Provider (Optional)

By default, Sushify monitors OpenAI, Anthropic, and Google AI APIs. To monitor a custom provider:

```bash
export LLM_PROVIDER_BASE_URL=your-custom-ai-gateway.com
```

**Examples:**

```bash
# Custom gateway
export LLM_PROVIDER_BASE_URL=api.mygateway.com

# Self-hosted with port
export LLM_PROVIDER_BASE_URL=https://my-llm-server.internal:8080

# Azure OpenAI
export LLM_PROVIDER_BASE_URL=https://your-resource.openai.azure.com
```

### Start Using Sushify

```bash
# Wrap any command that makes LLM API calls
sushify start "python your-ai-app.py"
sushify start "node your-ai-app.js"
sushify start "npm start"
sushify start "docker compose up"
```

That's it! Open your browser to the dashboard URL shown in the terminal to see your LLM interactions being captured and analyzed in real-time.

### ✨ What You Get

With Sushify configured, you'll get:

- 🍣 **Quality scoring** for each prompt
- 🔍 **Problem detection** in instructions
- 📊 **Real-time feedback** in the dashboard
- 🎯 **Smart recommendations** to improve your prompts

## 🌐 Language Support

Sushify works with **any programming language** that uses standard HTTP libraries:

- ✅ **Python** - `requests`, `urllib3`, `httpx`, Flask, Django, FastAPI
- ✅ **Node.js v24+** - Native `fetch()`, OpenAI SDK, Anthropic SDK
- ✅ **Go** - `net/http` package
- ✅ **Rust** - `reqwest` and other HTTP clients
- ✅ **Java** - JVM proxy configuration
- ✅ **C#/.NET** - `HttpClient` with proxy support
- ✅ **PHP** - `cURL` and `Guzzle`
- ✅ **Docker containers** - Any language in containers

**Works automatically with zero code changes!** Sushify configures standard proxy environment variables that most HTTP clients respect automatically.

> **Node.js < v24**: Limited AI SDK support due to missing native `fetch()`. See [`docs/OLD-NODE-INSTRUCTIONS.md`](./docs/OLD-NODE-INSTRUCTIONS.md) for workarounds.

> **Google AI**: Google's client uses gRPC by default. For LLM API capture, add `transport="rest"` to your client configuration: `genai.configure(transport="rest")`

## 🎯 Usage Examples

```bash
# Python applications
sushify start "python main.py"
sushify start "flask run"
sushify start "uvicorn app:app --reload"

# Node.js applications
sushify start "node app.js"
sushify start "npm start"
sushify start "npm run dev"

# Other languages
sushify start "go run main.go"
sushify start "bun run dev"
sushify start "deno run main.ts"
sushify start "cargo run"

# Docker applications
sushify start --docker=backend "docker compose up"
```

### 🔧 What Happens During Setup

The one-time setup will:

- ✅ Check for Python 3.8+ and Node.js
- ✅ Install mitmproxy (HTTP proxy for traffic capture)
- ✅ **Install HTTPS certificate** (requires your password once)
- ✅ Provide installation guidance if anything is missing

**Why the certificate?** Sushify needs to intercept HTTPS traffic to analyze AI API calls (OpenAI, Anthropic, etc.). The certificate is only active when Sushify runs and can be removed anytime with `sushify cleanup`.

> **One-time only**: You'll be prompted for your password once to install the certificate. After that, Sushify works without any authentication.

## 🐳 Docker Support

Sushify seamlessly works with containerized applications:

```bash
# Automatically configure specific Docker services
sushify start --docker=backend "docker compose up"
sushify start --docker=api-service "docker compose up"
```

Sushify automatically configures proxy settings and certificate mounting for your containers. Works with any language (Python, Node.js, Go, Java, etc.) running in Docker.

## ✨ Features

- 🌍 **Language agnostic** - Works with Python, Go, Node.js, Rust, etc.
- 🐳 **Docker support** - Seamlessly wraps containerized applications
- 🔍 **Zero code changes** - Intercept LLM calls automatically
- 📊 **Real-time analysis** - Get sushi quality scores instantly
- 🎯 **Smart recommendations** - Turn soup-like prompts into sushi
- 📱 **Beautiful dashboard** - Monitor all LLM interactions

## 📋 Logging & Debugging

Sushify creates detailed logs to help with troubleshooting and bug reports. Each session generates its own logging directory with structured logs.

### Log Location

```
~/.sushify/logs/
├── session-2025-09-04-103045/    # Each session gets its own folder
│   ├── interceptor.log           # Python mitmproxy logs
│   └── server.log                # Node.js server/analysis logs
├── session-2025-09-04-110230/    # Previous sessions
└── latest -> session-2025-09-04-103045/  # Symlink to current session
```

### What Gets Logged

- **interceptor.log**: Request/response interception, network errors, exchange capturing
- **server.log**: Dashboard startup, LLM analysis results, API calls

### Log Formats

**Interceptor Log (Python)**:

```
2025-09-04 10:30:46 INFO  Interceptor loaded successfully
2025-09-04 10:30:47 DEBUG Request intercepted: POST https://api.openai.com/v1/chat/completions
2025-09-04 10:30:47 DEBUG Response received: POST https://api.openai.com/v1/chat/completions (200, 150ms)
2025-09-04 10:30:47 INFO  Exchange captured: POST https://api.openai.com/v1/chat/completions (200, 150ms)
```

**Server Log (Node.js)**:

```
2025-09-04 10:30:45 INFO  [startup] Starting dashboard and proxy services
2025-09-04 10:30:47 INFO  [analysis] Starting LLM analysis for exchange_123456
2025-09-04 10:30:48 INFO  [analysis] Analysis completed for exchange_123456 (issues found: 2)
```

### Session Information

When starting Sushify, the log directory path is displayed:

```bash
$ sushify start "python app.py"
🍣 Sushify - Turn your prompt salad into sushi

🔍 Checking dependencies...
📁 Session logs: ~/.sushify/logs/session-2025-09-04-103045
```

### Automatic Cleanup

Sushify automatically keeps the 10 most recent session directories and removes older ones to prevent disk space issues.

### Reporting Issues

When reporting bugs, please include:

1. The entire session directory (compress and attach)
2. Your command that started Sushify
3. Steps to reproduce the issue

## 🛠️ Contributing

Want to contribute to Sushify or modify it for your needs?

👨‍💻 **See the [Development Guide](./docs/DEVELOPMENT.md)** for:

- Complete development setup instructions
- Local testing workflows
- Project structure and architecture
- Contributing guidelines
- Troubleshooting tips

We welcome contributions! The development guide has everything you need to get started.

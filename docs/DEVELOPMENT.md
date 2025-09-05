# 🛠️ Sushify Development Guide

This guide is for developers who want to contribute to Sushify or modify the library locally.

## 🏗️ Development Setup

### Prerequisites

- **[Node.js](https://nodejs.org/en/download)** version ^20.19 || ^22.12 || >=24 (Vite requirement)
  - **Recommended: v24.0.0+** for AI application proxy support
- **[Python 3.8+](https://www.python.org/downloads/)** with pip (for HTTP proxy functionality)
  - **Note:** Command `python3` must be available (even if `python` points to Python 2.7)
- **[OpenAI API Key](https://platform.openai.com/api-keys)** (optional, for prompt analysis)
- **Git** for cloning the repository
- **Docker and Docker Compose** (optional, for testing containerized applications)

### Getting Started

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd sushify
   ```

2. **Set up Node.js version** (if using nvm):

   ```bash
   nvm use
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Build the project**:

   ```bash
   npm run build
   ```

5. **Set up development environment** (one-time):
   ```bash
   ./build/bin/sushify.js setup
   ```

This will automatically:

- ✅ Check for Python 3.8+ and Node.js requirements
- ✅ Install mitmproxy (HTTP proxy for traffic capture)
- ✅ Install HTTPS certificate (one-time setup)
- ✅ Provide step-by-step guidance if any issues

**Note:** You will be prompted for your password to install the HTTPS certificate.

### Configure Your Environment

Set your OpenAI API key for testing analysis features:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

For custom LLM providers during testing:

```bash
export LLM_PROVIDER_BASE_URL=your-custom-ai-gateway.com
```

## 🎯 Development Usage

Test your changes using relative paths:

```bash
# Test with local build
./build/bin/sushify.js start "python test-apps/simple-python/test-app.py"
./build/bin/sushify.js start "npm start"
./build/bin/sushify.js start --docker=backend "docker compose up"
```

## 🚀 Local Testing

To test your changes on other apps without using relative paths:

```bash
# Install your local version globally
npm run install-local

# Now you can test from anywhere on your machine
cd ~/my-other-project
sushify start "python my-app.py"
```

This script builds, packages, installs globally, and cleans up automatically.

## 🧪 Testing Your Changes

Validate your development work with our included test applications:

```bash
# Test with a simple Python app
cd test-apps/simple-python
../../build/bin/sushify.js start "python test-app.py"

# Test with a Docker Compose multi-service app
cd test-apps/docker-compose
../../build/bin/sushify.js start --docker=backend "docker compose up"
```

See [`test-apps/`](../test-apps/) for detailed testing instructions and what each test validates.

## 🔧 First-time Setup Details

The setup process will:

- ✅ Check for Python 3.8+ installation
- ✅ Install mitmproxy automatically (if possible)
- ✅ **Install HTTPS certificate** (one-time, requires password)
- ✅ Provide platform-specific installation instructions if needed

### 🔐 Certificate Installation (One-time)

During setup, you'll be prompted for your password to install a development certificate. This is needed because:

- **Sushify intercepts HTTPS traffic** to analyze AI API calls (OpenAI, Anthropic, etc.)
- **Your system must trust the certificate** for HTTPS interception to work
- **This is standard practice** - Charles, Fiddler, and other dev tools do the same
- **It's completely safe** - the certificate only works when Sushify proxy is running

**Security Notes:**

- ✅ Certificate only works with Sushify proxy (localhost:7332)
- ✅ Cannot intercept traffic without explicit proxy configuration
- ✅ Only active when you run `sushify start`
- ✅ Can be removed anytime with `sushify cleanup`

**You'll only be asked for your password once** - subsequent uses of Sushify require no authentication.

> **Note**: Python 3.8+ is required for HTTP traffic interception. The setup script will guide you through installation if Python is not found.

### 📁 Data Directory

Sushify creates a `~/.sushify/` directory in your home folder for:

- **🔐 SSL certificates** - `mitmproxy-ca-cert.pem` (installed once during setup)
- **📁 Session logs** - `logs/session_YYYY-MM-DD__HH-MM-SS/` (interceptor.log, server.log)
- **🐳 Docker Compose temp files** - `docker-compose.sushify-*.yml` (auto-created and cleaned up)

These files are automatically managed and typically don't require manual intervention. If you need to reset certificates or clear temp files, you can safely delete the `~/.sushify/` directory and run setup again.

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make your changes** to the codebase
3. **Test thoroughly** using the test apps in `test-apps/`
4. **Run linting**: `npm run lint && npm run check`
5. **Build**: `npm run build`
6. **Test globally**: `npm run install-local` then test with real apps
7. **Commit and push** your changes

### Project Structure

- `src/` - Core SvelteKit dashboard and TypeScript logic
- `bin/` - CLI entry points and commands
- `test-apps/` - Test applications for development validation
- `docs/` - Documentation files
- `scripts/` - Development and setup scripts
- `.local-files/` - Temporary development files (git-ignored)

### Key Components

- **Dashboard**: Real-time SvelteKit app with SSE for live updates
- **Proxy**: mitmproxy-based HTTPS interception with Python interceptor
- **CLI**: Node.js-based command interface with Docker Compose support
- **Certificate Management**: Cross-platform HTTPS certificate installation
- **Analysis Engine**: OpenAI-powered prompt quality analysis

## 📋 Logging & Debugging

### Log Location

```
~/.sushify/logs/
├── session-2025-09-04__10-30-45/    # Each session gets its own folder
│   ├── interceptor.log               # Python mitmproxy logs
│   └── server.log                    # Node.js server/analysis logs
├── session-2025-09-04__11-02-30/    # Previous sessions
└── latest -> session-2025-09-04__10-30-45/  # Symlink to current session
```

### What Gets Logged

- **interceptor.log**: Request/response interception, network errors, exchange capturing
- **server.log**: Dashboard startup, LLM analysis results, API calls, capture state changes

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
2025-09-04 10:30:50 INFO  [capture] Proxy capture disabled
```

### Session Information

When starting Sushify, the log directory path is displayed:

```bash
$ sushify start "python app.py"
🍣 Sushify - Turn your prompt salad into sushi

🔍 Checking dependencies...
📁 Session logs: ~/.sushify/logs/session-2025-09-04__10-30-45
```

### Automatic Cleanup

Sushify automatically keeps the 10 most recent session directories and removes older ones to prevent disk space issues.

### Reporting Issues

When reporting bugs, please include:

1. The entire session directory (compress and attach)
2. Your command that started Sushify
3. Steps to reproduce the issue

## 🚀 JavaScript Runtime Support

### ✅ **Recommended: Modern Runtimes** (Zero Configuration)

**Perfect for AI applications with zero code changes:**

- ✅ **Node.js v24.0.0+** - Native `fetch()` proxy support
- ✅ **Deno** - Built-in proxy support for `fetch()`
- ✅ **Bun** - [Native `HTTP_PROXY` support](https://bun.com/guides/http/proxy)
- ✅ **OpenAI SDK** - Works automatically on modern runtimes
- ✅ **Anthropic SDK** - Works automatically on modern runtimes
- ✅ **All AI SDKs** - Most use native `fetch()` internally

**Just run your app with Sushify - no code changes needed!** 🎯

### ⚠️ **Legacy Node.js Support** (< v24)

**Limited compatibility due to AI SDK requirements:**

- ❌ **OpenAI SDK** - Requires native `fetch()` (Node.js v24.0.0+)
- ❌ **Anthropic SDK** - Requires native `fetch()` (Node.js v24.0.0+)
- ❌ **Most AI SDKs** - Use native `fetch()` internally
- ⚠️ **Custom HTTP clients** - Require manual proxy configuration

**💡 Recommendation:** Upgrade to Node.js v24+ for the best AI development experience!

📚 **Need help with older Node.js versions?** See [`OLD-NODE-INSTRUCTIONS.md`](./OLD-NODE-INSTRUCTIONS.md) for detailed setup instructions.

### 🐍 **Python Application Support**

**Universal compatibility:**

- ✅ **Any Python version** - Full support with zero code changes
- ✅ **`requests` library** - Automatic proxy support via `REQUESTS_CA_BUNDLE`
- ✅ **`urllib3`, `httpx`** - Standard proxy environment variable support
- ✅ **Django, Flask, FastAPI** - Works with any Python web framework

Python applications work out-of-the-box with Sushify's language-agnostic proxy configuration.

### 🌐 **Universal Language Support**

**Works with any language that respects standard proxy environment variables:**

- ✅ **Go** - `net/http` package
- ✅ **Rust** - `reqwest` and other HTTP clients
- ✅ **Java** - JVM proxy configuration
- ✅ **C#/.NET** - `HttpClient` with proxy support
- ✅ **PHP** - `cURL` and `Guzzle`
- ✅ **And many more** - Most modern HTTP clients support standard proxy env vars

**Sushify automatically configures these environment variables:**

- `HTTP_PROXY` / `HTTPS_PROXY` - Standard proxy configuration
- `SSL_CERT_FILE` / `REQUESTS_CA_BUNDLE` / `CURL_CA_BUNDLE` - Certificate paths
- Language-specific variables for Node.js, Python, etc.

**User-configurable environment variables:**

- `OPENAI_API_KEY` - Enable prompt analysis (optional)
- `LLM_PROVIDER_BASE_URL` - Monitor custom AI provider instead of defaults (optional)

**If your app's HTTP client respects these standard environment variables, it works automatically!** 🎯

## 🐳 Docker Compose Support

For testing containerized applications during development:

```bash
# Automatically configure Docker services for traffic capture
./build/bin/sushify.js start --docker=backend "docker compose up"
./build/bin/sushify.js start --docker=api-service "docker compose up"
```

Sushify automatically:

- ✅ **Generates proxy configuration** for your specified service
- ✅ **Handles certificate mounting** for HTTPS interception
- ✅ **Works with any language** in containers (Python, Node.js, Go, Java, etc.)
- ✅ **Cleans up** generated files when done

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the project
- `npm run check` - TypeScript and Svelte checks
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run install-local` - Install local version globally for testing
- `npm run test:python` - Run Python test app

## 🤝 Contributing Guidelines

1. **Follow the existing code style** - we use Prettier and ESLint
2. **Write tests** for new functionality when possible
3. **Update documentation** when adding features
4. **Test thoroughly** with the included test applications
5. **Keep commits focused** - one feature or fix per commit
6. **Write clear commit messages** - explain what and why

## 🐛 Troubleshooting

### Common Issues

1. **Certificate errors**: Run `sushify cleanup` then `sushify setup`
2. **Python not found**: Install Python 3.8+ and ensure `python3` command is available (even if `python` points to Python 2.7)
3. **mitmproxy errors**: Current mitmproxy versions require Python 3.8+. The interceptor script uses the `#!/usr/bin/env python3` shebang
4. **Google AI not captured**: Google's client uses gRPC by default (not HTTP). Force REST mode with `transport="rest"` in your client config: `genai.configure(transport="rest")`
5. **Node.js compatibility**: Use Node.js v24+ for best results
6. **Permission errors**: Ensure you have admin privileges for certificate installation

### Getting Help

- Check the logs in `~/.sushify/logs/latest/`
- Review test applications in `test-apps/` for working examples
- Create an issue with detailed logs and reproduction steps

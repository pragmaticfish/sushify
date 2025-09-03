# 🍣 Sushify

**"Turn your prompt salad into sushi"** 🥗 → 🍣

Automatically capture and analyze every LLM API call in your application. Transform messy, contradictory prompts into precision-crafted AI interactions with zero code changes.

> **📖 This README is for developers contributing to Sushify.** For end-user documentation, visit the [marketing site](link-to-be-added) or try the [playground](link-to-be-added).

## 👨‍💻 Development Setup

### Prerequisites

- **[Node.js](https://nodejs.org/en/download)** version ^20.19 || ^22.12 || >=24 (Vite requirement)
  - **Recommended: v24.0.0+** for AI application proxy support
- **[Python 3.8+](https://www.python.org/downloads/)** with pip (for HTTP proxy functionality)
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
   ./bin/sushify.js setup
   ```

This will automatically:

- ✅ Check for Python 3.8+ and Node.js requirements
- ✅ Install mitmproxy (HTTP proxy for traffic capture)
- ✅ Install HTTPS certificate (one-time setup)
- ✅ Provide step-by-step guidance if any issues

**Note:** You may be prompted for your password to install the HTTPS certificate.

### 🧠 Enable Prompt Analysis (Optional)

To enable real-time prompt quality analysis, set your OpenAI API key:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or add it to your shell profile for persistence:

```bash
echo 'export OPENAI_API_KEY=sk-your-key-here' >> ~/.zshrc
source ~/.zshrc
```

**With analysis enabled, you'll get:**

- 🍣 **Quality scoring** for each prompt
- 🔍 **Problem detection** in instructions
- 📊 **Real-time feedback** in the dashboard

**Cost:** ~$0.01-0.05 per prompt analysis using GPT-4.1

### 🔧 Custom LLM Provider (Optional)

By default, Sushify monitors calls to OpenAI, Anthropic, and Google AI APIs. To monitor a custom LLM provider (like Azure OpenAI, custom gateways, or self-hosted models), set:

```bash
export LLM_PROVIDER_BASE_URL=your-custom-ai-gateway.com
```

**Examples:**

```bash

# Custom gateway (domain only)
export LLM_PROVIDER_BASE_URL=api.mygateway.com

# Self-hosted with port
export LLM_PROVIDER_BASE_URL=https://my-llm-server.internal:8080

# Path-specific matching (only captures /v1/* endpoints)
export LLM_PROVIDER_BASE_URL=https://api.mygateway.com/v1

# Very specific path matching
export LLM_PROVIDER_BASE_URL=https://my-ai-server.com/api/v2/chat
```

**Note:** This replaces the default AI domains entirely. Only POST requests with conversation content matching your specified URL pattern will be captured and analyzed.

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

📚 **Need help with older Node.js versions?** See [`docs/OLD-NODE-INSTRUCTIONS.md`](./docs/OLD-NODE-INSTRUCTIONS.md) for detailed setup instructions.

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

## 🎯 Development Usage

```bash
# Test with relative paths during development
./bin/sushify.js start "python main.py"    # Python
./bin/sushify.js start "go run main.go"    # Go
./bin/sushify.js start "npm start"         # Node.js
./bin/sushify.js start "bun run dev"       # Bun
./bin/sushify.js start "deno run main.ts"  # Deno
./bin/sushify.js start "cargo run"         # Rust
```

### 🔧 First-time Setup Details

The setup process will:

- ✅ Check for Python 3.8+ installation
- ✅ Install mitmproxy automatically (if possible)
- ✅ **Install HTTPS certificate** (one-time, requires password)
- ✅ Provide platform-specific installation instructions if needed
- ✅ Install Sushify globally for easy access

#### 🔐 Certificate Installation (One-time)

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
- **🐳 Docker Compose temp files** - `docker-compose.sushify-*.yml` (auto-created and cleaned up)

These files are automatically managed and typically don't require manual intervention. If you need to reset certificates or clear temp files, you can safely delete the `~/.sushify/` directory and run `./bin/sushify.js setup` again.

## 🐳 Docker Compose Support

For testing containerized applications during development:

```bash
# Automatically configure Docker services for traffic capture
./bin/sushify.js start --docker=backend "docker compose up"
./bin/sushify.js start --docker=api-service "docker compose up"
```

Sushify automatically:

- ✅ **Generates proxy configuration** for your specified service
- ✅ **Handles certificate mounting** for HTTPS interception
- ✅ **Works with any language** in containers (Python, Node.js, Go, Java, etc.)
- ✅ **Cleans up** generated files when done

## 🧪 Testing Your Changes

Validate your development work with our included test applications:

```bash
# Test with a simple Python app
cd test-apps/simple-python
../../bin/sushify.js start "python test-app.py"

# Test with a Docker Compose multi-service app
cd test-apps/docker-compose
../../bin/sushify.js start --docker=backend "docker compose up"
```

See [`test-apps/`](./test-apps/) for detailed testing instructions and what each test validates.

## ✨ Features

- 🌍 **Language agnostic** - Works with Python, Go, Node.js, Rust, etc.
- 🐳 **Docker support** - Seamlessly wraps containerized applications
- 🔍 **Zero code changes** - Intercept LLM calls automatically
- 📊 **Real-time analysis** - Get sushi quality scores instantly
- 🎯 **Smart recommendations** - Turn soup-like prompts into sushi
- 📱 **Beautiful dashboard** - Monitor all LLM interactions

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make your changes** to the codebase
3. **Test thoroughly** using the test apps in `test-apps/`
4. **Run linting**: `npm run lint`
5. **Build**: `npm run build`
6. **Commit and push** your changes

### Project Structure

- `src/` - Core SvelteKit dashboard and TypeScript logic
- `bin/` - CLI entry points and commands
- `scripts/` - Setup and installation scripts
- `test-apps/` - Test applications for development validation
- `.local-files/` - Temporary development files (git-ignored)

### Key Components

- **Dashboard**: Real-time SvelteKit app with SSE for live updates
- **Proxy**: mitmproxy-based HTTPS interception with Python interceptor
- **CLI**: Node.js-based command interface with Docker Compose support
- **Certificate Management**: Cross-platform HTTPS certificate installation

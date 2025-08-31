# Test Applications

This directory contains test applications for **developers working on the Sushify codebase**. Use these to verify functionality, test changes, and ensure the proxy interception works correctly across different deployment scenarios.

## For Contributors & Developers

These test apps help you:

- ✅ **Verify your changes** work correctly
- ✅ **Test new features** before committing
- ✅ **Reproduce issues** and validate fixes
- ✅ **Understand how Sushify works** under the hood

## 🚀 Quick Start

From the project root, run these convenience scripts to automatically build and test:

```bash
npm run test:python    # Test simple Python app
npm run test:docker    # Test Docker Compose app
```

These scripts automatically:

- ✅ Build Sushify (copies CLI files to `build/` directory)
- ✅ Navigate to the test app directory
- ✅ Run the test with proper Sushify configuration

## Available Test Apps

### 📁 [`simple-python/`](./simple-python/)

- **Type**: Standalone Python application
- **Use Case**: Testing local application wrapping
- **Features**: Makes HTTPS API calls to multiple services
- **Usage**: `../../bin/sushify.js start "python test-app.py"`

### 📁 [`docker-compose/`](./docker-compose/)

- **Type**: Multi-service Docker Compose application
- **Use Case**: Testing containerized application wrapping
- **Features**: Node.js backend with external API calls, Nginx frontend, PostgreSQL database
- **Usage**: `../../bin/sushify.js start --docker=backend "docker compose up"`

### 📁 [`open-ai-simple-chat/`](./open-ai-simple-chat/)

- **Type**: Node.js WebSocket chat application
- **Use Case**: Testing OpenAI SDK integration and real-time LLM calls
- **Features**: Interactive web chat, OpenAI API calls, WebSocket communication
- **Requirements**: Node.js v23+, `OPENAI_API_KEY` environment variable
- **Usage**: `../../bin/sushify.js start "npm start"`

## Quick Start for Development

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd sushify
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up Sushify** (one-time):

   ```bash
   npm run build
   ./bin/sushify.js setup
   ```

4. **Choose a test app** and follow its specific README

5. **Run with Sushify** to see traffic interception in action

## What You'll See

When running any test app with Sushify, you'll get:

- 🎛️ **Dashboard**: Real-time view of captured HTTP/HTTPS traffic at `http://localhost:7331`
- 🔍 **Detailed Exchanges**: Request/response details, timing, headers
- 🌐 **Universal Compatibility**: Works with any language or deployment method

### Expected Output

**In the Terminal:**

```
🚀 Starting Sushify with command: python test-app.py
🍣 Sushify - Turn your prompt salad into sushi
✅ Dashboard running at: http://localhost:7331
✅ Proxy running at: http://localhost:7332
📡 Making API calls...
✅ All traffic captured successfully
```

**In the Dashboard:**

- 📊 **Real-time HTTPS capture** with full request/response details
- ⏱️ **Response times** and status codes
- 🔗 **Detailed exchanges** showing captured API calls

## Language Agnostic Testing

These examples demonstrate Sushify's language-agnostic nature:

- **Python**: Using `requests` library with `REQUESTS_CA_BUNDLE`
- **Node.js**: Using `node-fetch` and `https-proxy-agent` with `NODE_EXTRA_CA_CERTS`
- **Any Language**: Environment variables configure certificate trust automatically

The magic happens at the infrastructure level - no application code changes needed! 🍣✨

## Common Test Endpoints

Most test apps make calls to these external services:

- 🌐 **httpbin.org** - HTTP testing service for validation
- 🐙 **api.github.com** - Real-world API example
- 📋 **jsonplaceholder.typicode.com** - Mock JSON API for testing

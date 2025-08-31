# OpenAI Simple Chat Test App

A Node.js WebSocket chat application that uses the OpenAI SDK to demonstrate Sushify's ability to capture LLM API calls.

## 🎯 Purpose

This test app demonstrates:

- **OpenAI SDK integration** - Real-world usage of the OpenAI client
- **WebSocket chat interface** - Interactive web-based chat
- **LLM request capture** - Shows Sushify capturing actual AI API calls
- **Node.js v23+ compatibility** - Uses native `fetch()`

## 📋 Prerequisites

- **Node.js v23+** (for native `fetch()` proxy support)
- **OpenAI API key** - Set as `OPENAI_API_KEY` environment variable
- **Sushify repo cloned** and dependencies installed (see [main README](../../README.md))

## 🚀 Running with Sushify

```bash
# From the test-apps/open-ai-simple-chat directory
cd test-apps/open-ai-simple-chat

# Switch to Node.js v23+ (required for native fetch proxy support)
nvm use  # Uses .nvmrc file (Node.js v24)

# Install dependencies
npm install

# Set your OpenAI API key
export OPENAI_API_KEY="your-openai-api-key-here"

# Run with Sushify (using relative path to development build)
../../bin/sushify.js start "npm start"
```

## 🌐 Usage

1. **Start the app** - The command above starts both Sushify and the chat app
2. **Open browser** - Navigate to `http://localhost:8081`
3. **Chat with AI** - Type messages in the web interface
4. **View captured requests** - Check the Sushify dashboard at `http://localhost:7331`

## 🔍 What Gets Captured

When you send chat messages, Sushify will capture:

- **OpenAI API calls** - The actual LLM requests and responses from the chat interface
- **Real-time LLM traffic** - Every message you send generates an API call that appears in the dashboard

## 🛠️ Technical Details

### Dependencies

- **`openai`** - Official OpenAI SDK (uses native `fetch()`)
- **`ws`** - WebSocket server for real-time chat
- **`zod`** - Schema validation for structured outputs
- **`typescript`** - Type safety and development experience

### Proxy Configuration (nothing in this app, sushify takes care of this automatically)

The app automatically uses Sushify's proxy configuration via:

- `NODE_USE_ENV_PROXY=1` - Enables native Node.js proxy support
- `HTTP_PROXY` / `HTTPS_PROXY` - Standard proxy environment variables
- `NODE_EXTRA_CA_CERTS` - Certificate path for SSL verification

### Architecture

```
Browser (WebSocket) ↔ Node.js Server ↔ OpenAI API
                                      ↕
                                  Sushify Proxy
```

## 🧪 Expected Behavior

**Successful capture indicators:**

- Console shows proxy environment variables on startup
- Chat interface loads at `http://localhost:8081`
- Chat messages trigger OpenAI API calls visible in Sushify dashboard
- WebSocket connection works without proxy interference

**If requests aren't captured:**

- Verify Node.js version is v23+ (`node --version`)
- Check that `OPENAI_API_KEY` is set
- Ensure Sushify dashboard shows "Capturing: ON"

## 📝 Notes

- **Model**: Uses `gpt-4.1-nano` (configurable in `src/llm.ts`)
- **Port**: Runs on `8081` (WebSocket and HTTP)
- **History**: Maintains per-connection chat history
- **Retry logic**: Handles OpenAI rate limits with exponential backoff

# 🍣 Sushify

**"Turn your prompt salad into sushi"** 🥗 → 🍣

Sushify is a development tool that runs on your local machine, wraps your AI app, and automatically captures and analyzes every LLM API call in your application - catching issues that can cause unpredictable behaviors and bad outputs.

The best part? No code changes needed. No complex configuration files (actually no configuration files at all!).
It supports any app (including dockerized) that can be proxied, regardless of programming language or LLM provider.

**You can set it up in ~5 minutes**.

![Sushify dashboard](https://github.com/user-attachments/assets/6e71f4c2-a279-4465-bb89-3562de392804)
![Sushify analysis](https://github.com/user-attachments/assets/ee40a19e-50fc-466b-9c5a-a00f5c230713)

## Who? When? Why? How?

- **Who is Sushify for?** Developers building AI applications
- **When?** During development. Sushify runs on your localhost.
- **Why?** Because we pass tons of free text to LLMs, usually made out of fragments, sometimes involving conditional logic. System prompts, tool descriptions, output schemas - sometimes thousands of tokens that evolve over time. There is no compiler, no linter. It's all free text. And we haven't even started talking about context management bugs. How many times has your app started misbehaving and after a lot of digging you realized that it's because you (or someone else) messed up some of the instructions? No more!
- **How?** Sushify runs a proxy that wraps your app and intercepts network requests and responses to LLMs. Each exchange is sent to OpenAI for analysis using your API key. The analysis results are displayed on a dashboard that runs locally on your machine, highlighting issues and suggesting fixes.

---

**Current status**: Sushify is currently in Alpha. It is very new and seeking for feedback and contributions.

## ✨ Features

- 🌍 **Language agnostic, Zero code changes** - Treats you app like a black-box
- 🐳 **Docker support** - Seamlessly wraps containerized applications
- 📊 **Real-time deep/cheap analysis** - Get sushiness scores and detailed reports instantly
- 🎯 **Smart recommendations** - Turn soup-like prompts into sushi
- 📱 **Simple dashboard** - Inspect all LLM interactions with ease

## 🚀 Quick Start

### Prerequisites

- **[Node.js](https://nodejs.org/en/download)** version ^20.19 || ^22.12 || >=24
- **[Python 3.8+](https://www.python.org/downloads/)** with pip (for HTTP proxy functionality)
  - **Note:** Command `python3` must be available (even if `python` points to Python 2.7)
- **[OpenAI API Key](https://platform.openai.com/api-keys)** (optional, for prompt analysis)
  > Note: Sushify sends your prompts to open AI for analysis (request body, url and response), besides that everything runs locally on your machine.

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
**Why the certificate?** Sushify needs to intercept HTTPS traffic to analyze AI API calls (OpenAI, Anthropic, etc.). The certificate is only active when Sushify runs and can be removed anytime with `sushify cleanup`.

> **One-time only**: You'll be prompted for your password once to install the certificate. After that, Sushify works without any authentication.

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

````bash
# Wrap any command that makes LLM API calls
```bash
sushify start "python main.py"
sushify start "flask run"
sushify start "npm start"
sushify start "npm run dev"
# Docker applications
sushify start --docker=backend "docker compose up"
````

That's it! Open your browser to the dashboard URL shown in the terminal to see your LLM interactions being captured and analyzed in real-time.

### ✨ What You Get

With Sushify configured, you'll get:

- 🍣 **Quality scoring** for each prompt
- 🔍 **Problem detection** in instructions
- 📊 **Real-time feedback** in the dashboard
- 🎯 **Smart recommendations** to improve your prompts

## 🌐 Language Support

> Note: I am testing more SDKs, popular frameworks and languages and looking for inputs from the community.

Sushify works by setting standard proxy environment variables (`HTTP_PROXY`, `HTTPS_PROXY`) and certificate paths. This works automatically with libraries that respect these environment variables:

### ✅ **Confirmed Working** (tested)

- **Python** - `requests`, `urllib3`, `httpx` (via `REQUESTS_CA_BUNDLE`)
- **Node.js v24+** - Native `fetch()` (via `NODE_EXTRA_CA_CERTS` + `NODE_USE_ENV_PROXY`)
- **Docker containers** - Python and Node.js apps in containers

### 🟡 **Should Work** (proxy environment variable support)

- **Go** - `net/http` package (respects `HTTP_PROXY`/`HTTPS_PROXY`)
- **Rust** - `reqwest` with default features (proxy support enabled)
- **Java** - JVM with `-Djava.net.useSystemProxies=true`
- **C#/.NET** - `HttpClient` (respects proxy environment variables)
- **PHP** - `cURL` and `Guzzle` (via `CURL_CA_BUNDLE`)
- **Bun** / **Deno** - Should work like Node.js but not tested

### ⚠️ **May Need Code Changes**

- **Frameworks that ignore proxy env vars** - Custom HTTP clients, some SDKs
- **gRPC clients** - Often need explicit proxy configuration
- **WebSocket libraries** - May not respect HTTP proxy settings

**Works automatically with zero code changes!** Sushify configures standard proxy environment variables that most HTTP clients respect automatically.

> **Node.js < v24**: See [`docs/OLD-NODE-INSTRUCTIONS.md`](./docs/OLD-NODE-INSTRUCTIONS.md) for workarounds.

> **Google SDK**: Google's client uses gRPC by default. For LLM API capture, add `transport="rest"` to your client configuration`

## 🐳 Docker Support

Sushify seamlessly works with containerized applications:

```bash
# Automatically configure specific Docker services
sushify start --docker=backend "docker compose up"
sushify start --docker=api-service "docker compose up"
```

Sushify automatically configures proxy settings and certificate mounting for your containers.

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

### Automatic Cleanup

Sushify automatically keeps the 10 most recent session directories and removes older ones to prevent disk space issues.

## F.A.Q

1. **Q**: What's the difference between Sushify and running evals?
   **A**: Evals focus on the LLM's output and Sushify, while output aware, focuses on the inputs.
2. **Q**: Why use a proxy rather than X?
   **A**: I considered and implemented various approaches in an attempt to solve this problem. I might give a talk or write about it one day. Other solutions either require code modifications that are easy to get wrong or break under the complexity of real world apps. With that said, I am open to feedback from the community and will course correct if needed.
3. **Q**: What is Pragmatic Fish? You're just one person...
   **A**: I am one person now but I hope that others will want to join me. Almost all the dev tools for LLM apps are still MIA and Pragmatic Fish is my attempt to start something that addresses these gaps in novel and creative ways.
4. **Q**: Why use OpenAI for analysis?
   **A**: Because it's easy for the MVP. They have great support for structured outputs and I know their models very well. Ideally a future version would allow using local models and then it will be completely free and super cool.
5. **Q**: Can you add feature X?
   **A**: Sure, why not. Open an issue and let's talk.

## 🛠️ Contributing

Want to contribute to Sushify or modify it for your needs?

👨‍💻 **See the [Development Guide](./docs/DEVELOPMENT.md)** for:

Contributions and feedback are welcome!! The development guide has everything you need to get started.

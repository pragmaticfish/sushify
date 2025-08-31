# 🚧 Legacy Node.js Support (< v24)

**⚠️ For users stuck on older Node.js versions who can't upgrade**

## 📋 Quick Navigation

- **Using AI SDKs?** → See [🤖 AI SDK Applications](#-ai-sdk-applications)
- **Making direct API calls?** → See [🌐 Direct REST API Calls](#-direct-rest-api-calls)
- **Need to compare options?** → See [📊 HTTP Client Comparison](#-http-client-comparison)

## The Problem

Most modern AI SDKs (OpenAI, Anthropic, etc.) use native `fetch()` internally, which only supports automatic proxy configuration in Node.js v24.0.0+. If you're on an older Node.js version, these SDKs won't automatically use Sushify's proxy.

## The Solutions

### Option 1: Upgrade Node.js (Strongly Recommended)

```bash
# Using nvm (recommended)
nvm install 24
nvm use 24

# Or download from nodejs.org
# https://nodejs.org/en/download/
```

**Benefits:**

- ✅ Zero code changes required
- ✅ Works with all AI SDKs automatically
- ✅ Better performance and security
- ✅ Future-proof

### Option 2: Manual Proxy Configuration (Complex)

If you absolutely cannot upgrade Node.js, you'll need to manually configure each HTTP client in your application.

## 🤖 AI SDK Applications

### OpenAI SDK

```javascript
// Install proxy agent
// npm install https-proxy-agent

const { HttpsProxyAgent } = require('https-proxy-agent');
const OpenAI = require('openai');

// Create proxy agent if environment variables are set
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// Override fetch with proxy support
const customFetch = (url, options = {}) => {
	return fetch(url, {
		...options,
		agent: agent
	});
};

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	fetch: customFetch // Custom fetch with proxy support
});
```

### Anthropic SDK

```javascript
const { HttpsProxyAgent } = require('https-proxy-agent');
const Anthropic = require('@anthropic-ai/sdk');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const customFetch = (url, options = {}) => {
	return fetch(url, {
		...options,
		agent: agent
	});
};

const anthropic = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY,
	fetch: customFetch
});
```

## 🌐 Direct REST API Calls

### Using Native `fetch()` (Node.js 18+)

```javascript
// Install proxy agent
// npm install https-proxy-agent

const { HttpsProxyAgent } = require('https-proxy-agent');

// Create proxy agent
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// Make OpenAI API calls with proxy
async function callOpenAI(messages) {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-4',
			messages: messages
		}),
		agent: agent // Add proxy agent
	});

	return response.json();
}

// Make Anthropic API calls with proxy
async function callAnthropic(messages) {
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': process.env.ANTHROPIC_API_KEY,
			'Content-Type': 'application/json',
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: 'claude-3-sonnet-20240229',
			max_tokens: 1000,
			messages: messages
		}),
		agent: agent // Add proxy agent
	});

	return response.json();
}
```

### Using Axios

```javascript
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// Create axios instance with proxy
const apiClient = axios.create({
	httpsAgent: agent,
	httpAgent: agent
});

// Make OpenAI API calls
async function callOpenAI(messages) {
	const response = await apiClient.post(
		'https://api.openai.com/v1/chat/completions',
		{
			model: 'gpt-4',
			messages: messages
		},
		{
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json'
			}
		}
	);

	return response.data;
}

// Make Anthropic API calls
async function callAnthropic(messages) {
	const response = await apiClient.post(
		'https://api.anthropic.com/v1/messages',
		{
			model: 'claude-3-sonnet-20240229',
			max_tokens: 1000,
			messages: messages
		},
		{
			headers: {
				'x-api-key': process.env.ANTHROPIC_API_KEY,
				'Content-Type': 'application/json',
				'anthropic-version': '2023-06-01'
			}
		}
	);

	return response.data;
}
```

### Using node-fetch (Legacy)

```javascript
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// Make API calls with proxy
async function callOpenAI(messages) {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-4',
			messages: messages
		}),
		agent: agent // Add proxy agent
	});

	return response.json();
}
```

## 📊 HTTP Client Comparison

| HTTP Client          | Proxy Support              | Setup Complexity | Best For               |
| -------------------- | -------------------------- | ---------------- | ---------------------- |
| **Native `fetch()`** | ✅ via `https-proxy-agent` | Medium           | Modern Node.js apps    |
| **Axios**            | ✅ via agent config        | Medium           | REST API heavy apps    |
| **node-fetch**       | ✅ via `https-proxy-agent` | Medium           | Legacy codebases       |
| **got**              | ✅ via agent config        | Medium           | Advanced HTTP features |
| **superagent**       | ✅ via proxy config        | Medium           | Chainable API style    |

**All require manual configuration on Node.js < v24!**

### 💡 Pro Tip: Which Approach Should You Use?

**If you're using AI SDKs:**

- Override the SDK's `fetch` function (see [🤖 AI SDK Applications](#-ai-sdk-applications))
- **Advantage**: Works with existing SDK abstractions
- **Disadvantage**: Each SDK needs separate configuration

**If you're making direct API calls:**

- Choose your preferred HTTP client and configure proxy (see [🌐 Direct REST API Calls](#-direct-rest-api-calls))
- **Advantage**: More control over HTTP configuration
- **Disadvantage**: Need to handle API details manually

## 🔄 Future: Manual Integration (Under Consideration)

We're considering a direct integration API for legacy applications:

```javascript
// Planned - not implemented yet
import { captureExchange } from 'sushify';

const response = await yourHttpClient.post('/api/chat', data);
await captureExchange({
	request: { method: 'POST', url: '/api/chat', body: data },
	response: { status: response.status, body: response.data }
});
```

**Downsides of manual integration:**

- 🧠 Mental overhead - need to remember to call it everywhere
- 🔍 Complex payload matching - handling Zod schemas, auth headers correctly
- 🐛 Easy to miss calls - especially in libraries or middleware
- 📚 More setup complexity

## Why We Recommend Node.js v24+

Modern AI development benefits significantly from Node.js v24.0.0+:

- **Zero configuration** - SDKs work automatically with Sushify
- **Native proxy support** - Built-in `fetch()` proxy via `NODE_USE_ENV_PROXY=1`
- **Better performance** - Improved V8 engine and native `fetch()`
- **Enhanced security** - Latest security patches and features
- **Future compatibility** - Most AI SDKs require Node.js v24+ for proxy support

## Still Need Help?

If you're absolutely stuck on an older Node.js version and manual proxy configuration isn't working, please [open an issue](https://github.com/pragmaticfish/sushify/issues) with:

- Your Node.js version (`node --version`)
- Your application's HTTP client library
- A minimal reproduction of the issue

We'll help you get up and running! 🚀

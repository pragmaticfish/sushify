# 🍣 Sushify

**"Turn your prompt salad into sushi"** 🥗 → 🍣

Transform messy, contradictory prompts into precision-crafted LLM interactions. Capture, analyze, and refine your AI conversations with zero code changes.

## 📋 Requirements

- **[Node.js](https://nodejs.org/en/download)** version ^20.19 || ^22.12 || >=24
- **[Python 3.8+](https://www.python.org/downloads/)** with pip (for HTTP proxy functionality)

## 🚀 Quick Start

```bash
# Install Sushify globally (includes setup)
npm install -g sushify
```

This will automatically:

- ✅ Check for Python 3.8+ and Node.js requirements
- ✅ Install mitmproxy (HTTP proxy for traffic capture)
- ✅ Install HTTPS certificate (one-time setup)
- ✅ Provide step-by-step guidance if any issues

**Note:** You may be prompted for your password to install the HTTPS certificate.

## 🎯 Usage

```bash
# Start your app with Sushify
sushify start "python main.py"    # Python
sushify start "go run main.go"    # Go
sushify start "npm start"         # Node.js
sushify start "cargo run"         # Rust
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

- ✅ Certificate only works with Sushify proxy (localhost:8080)
- ✅ Cannot intercept traffic without explicit proxy configuration
- ✅ Only active when you run `sushify start`
- ✅ Can be removed anytime with `sushify cleanup`

**You'll only be asked for your password once** - subsequent uses of Sushify require no authentication.

> **Note**: Python 3.8+ is required for HTTP traffic interception. The setup script will guide you through installation if Python is not found.

## ✨ Features

- 🌍 **Language agnostic** - Works with Python, Go, Node.js, Rust, etc.
- 🔍 **Zero code changes** - Intercept LLM calls automatically
- 📊 **Real-time analysis** - Get sushi quality scores instantly
- 🎯 **Smart recommendations** - Turn soup-like prompts into sushi
- 📱 **Beautiful dashboard** - Monitor all LLM interactions

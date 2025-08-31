# 🍣 Sushify

**"Turn your prompt salad into sushi"** 🥗 → 🍣

Transform messy, contradictory prompts into precision-crafted LLM interactions. Capture, analyze, and refine your AI conversations with zero code changes.

> **📖 This README is for developers contributing to Sushify.** For end-user documentation, visit the [marketing site](link-to-be-added) or try the [playground](link-to-be-added).

## 👨‍💻 Development Setup

### Prerequisites

- **[Node.js](https://nodejs.org/en/download)** version ^20.19 || ^22.12 || >=24 (Vite requirement)
- **[Python 3.8+](https://www.python.org/downloads/)** with pip (for HTTP proxy functionality)
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

## 🎯 Development Usage

```bash
# Test with relative paths during development
./bin/sushify.js start "python main.py"    # Python
./bin/sushify.js start "go run main.go"    # Go
./bin/sushify.js start "npm start"         # Node.js
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

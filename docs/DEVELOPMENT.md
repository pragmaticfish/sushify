# 🛠️ Sushify Development Guide

This guide is for developers who want to contribute to Sushify or modify the library locally.

## 🏗️ Development Setup

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

## 📁 Data Directory

Sushify creates a `~/.sushify/` directory in your home folder for:

- **🔐 SSL certificates** - `mitmproxy-ca-cert.pem` (installed once during setup)
- **📁 Session logs** - `logs/session_YYYY-MM-DD__HH-MM-SS/` (interceptor.log, server.log)
- **🐳 Docker Compose temp files** - `docker-compose.sushify-*.yml` (auto-created and cleaned up)

These files are automatically managed and typically don't require manual intervention. If you need to reset certificates or clear temp files, you can safely delete the `~/.sushify/` directory and run setup again.

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make your changes** to the codebase
3. **Test thoroughly** using the test apps in `test-apps/` or your own example apps
4. **Run linting**: `npm run lint && npm run check`
5. **Build**: `npm run build`
6. **Test globally (optional)**: `npm run install-local` then test with real apps
7. **Commit and push** your changes

### Project Structure

- `src/` - Core SvelteKit dashboard and TypeScript logic
- `bin/` - CLI entry points and commands
- `test-apps/` - Test applications for development validation
- `docs/` - Documentation files
- `scripts/` - Development and setup scripts

### Key Components

- **Dashboard**: Real-time SvelteKit app with SSE for live updates
- **Proxy**: mitmproxy-based HTTPS interception with Python interceptor
- **CLI**: Node.js-based command interface with Docker Compose support
- **Certificate Management**: Cross-platform HTTPS certificate installation
- **Analysis Engine**: OpenAI-powered prompt quality analysis

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the project
- `npm run check` - TypeScript and Svelte checks
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run install-local` - Install local version globally for testing

### Getting Help

- Check the logs in `~/.sushify/logs/latest/`
- Review test applications in `test-apps/` for working examples
- Create an issue with detailed logs and reproduction steps

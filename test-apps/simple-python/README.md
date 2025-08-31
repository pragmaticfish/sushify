# Simple Python Test App

A standalone Python application for **testing Sushify's local application wrapping** during development.

## 👨‍💻 For Sushify Developers

This test app helps you:

- ✅ **Verify local app wrapping** works correctly
- ✅ **Test certificate handling** and proxy configuration
- ✅ **Debug issues** with HTTPS interception
- ✅ **Validate changes** to the core proxy logic

## 📋 What This App Does

- Makes 3 HTTPS API calls to different services:
  - 🌐 **httpbin.org** - HTTP testing service
  - 🐙 **GitHub API** - Get inspirational zen message
  - 📋 **JSONPlaceholder** - Mock JSON API
- Uses Python's `requests` library
- Demonstrates certificate handling and proxy usage

## 🚀 How to Run (Development)

### Prerequisites

- **Complete setup** from [main README](../../README.md#development-setup)
- **Python 3.6+** installed
- **`requests` library**: `pip install requests`

### Run the Test

1. **Navigate to this directory** (from repo root):

   ```bash
   cd test-apps/simple-python
   ```

2. **Run the test** (from project root):

   ```bash
   cd ../../                    # Go to project root
   npm run test:python          # Build and run test app
   ```

3. **Watch the magic happen**:
   - 📡 App makes 3 HTTPS calls to test endpoints
   - 🔍 All traffic appears in real-time on the dashboard
   - ✅ App exits automatically after testing

See [test-apps README](../README.md#what-youll-see) for expected output and dashboard details.

## 🧪 Technical Focus

This test validates:

- ✅ **Python `requests` proxy configuration** via environment variables
- ✅ **Certificate handling** with `REQUESTS_CA_BUNDLE`
- ✅ **Local application wrapping** without code changes
- ✅ **HTTPS interception** for secure API calls

See [test-apps README](../README.md#language-agnostic-testing) for detailed technical information.

## 🔧 Customization

Want to test with your own APIs? Edit `test-app.py` and add your endpoints to the `test_urls` list. No other changes needed - Sushify will automatically capture everything! 🍣✨

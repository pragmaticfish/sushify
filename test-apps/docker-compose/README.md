# Docker Compose Test App

A multi-service containerized application for **testing Sushify's Docker Compose integration** during development.

## 👨‍💻 For Sushify Developers

This test app helps you:

- ✅ **Verify Docker Compose wrapping** works correctly
- ✅ **Test container proxy configuration** and certificate mounting
- ✅ **Debug issues** with containerized applications
- ✅ **Validate changes** to Docker integration logic
- ✅ **Test language-agnostic** certificate handling

## 📋 Architecture

This test app includes:

- 🔧 **Backend** (Node.js 24): **Normal** Express server using native `fetch()` (tests real-world modern apps)
- 🌐 **Frontend** (Nginx): Static web server serving HTML
- 🗄️ **Database** (PostgreSQL): Sample database service
- 🔗 **Host Proxy Access**: Direct connection to Sushify proxy via `host.docker.internal`

## 🚀 How to Run (Development)

### Prerequisites

- **Complete setup** from [main README](../../README.md#development-setup)
- **Docker and Docker Compose** installed

### Run the Test

1. **Navigate to this directory** (from repo root):

   ```bash
   cd test-apps/docker-compose
   ```

2. **Run the test** (from project root):

   ```bash
   cd ../../                    # Go to project root
   npm run test:docker          # Build and run Docker test app
   ```

3. **Watch the services start**:
   - 🐳 Docker Compose starts all services
   - 🔧 Backend becomes available at: `http://localhost:8000`
   - 🌐 Frontend available at: `http://localhost:3000`

4. **Test the backend API**:

   ```bash
   # Test external API calls
   curl http://localhost:8000/api/test

   # Start continuous testing
   curl http://localhost:8000/api/continuous
   ```

See [test-apps README](../README.md#what-youll-see) for expected output and dashboard details.

## 🔧 Available Backend Endpoints

### Health Check

```bash
curl http://localhost:8000/health
# Returns: {"status":"healthy","service":"backend",...}
```

### API Testing

```bash
curl http://localhost:8000/api/test
# Makes 3 external HTTPS calls and returns results
```

### Continuous Testing

```bash
curl http://localhost:8000/api/continuous
# Makes 5 API calls over 15 seconds for extended testing
```

### Service Info

```bash
curl http://localhost:8000/
# Returns HTML page with service information and proxy configuration
```

## 🧪 Technical Focus

This test validates:

- ✅ **Docker Compose service auto-configuration**
- ✅ **Container proxy environment setup**
- ✅ **Certificate mounting and trust**
- ✅ **Node.js `https-proxy-agent` integration**
- ✅ **Language-agnostic environment variables**

See [test-apps README](../README.md#common-test-endpoints) for the endpoints this app calls.

### Key Docker Integration Details

- **Auto-generated override**: `docker-compose.sushify.yml` with proxy configuration
- **Proxy bridge**: `socat` container routes traffic from containers to host
- **Certificate mounting**: mitmproxy cert mounted and trusted automatically
- **Environment variables**: Language-specific proxy and certificate configuration

For full technical details, see [main README](../../README.md) and [test-apps README](../README.md#language-agnostic-testing).

## 🔧 Customization

Edit `docker-compose.yml` to add your own services, then target them with:

```bash
../../bin/sushify.js start --docker=your-service "docker compose up"
```

The Sushify integration works with any language! 🍣✨

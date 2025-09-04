#!/usr/bin/env node

/**
 * Sushify Start Command Implementation
 * Orchestrates dashboard, proxy, and user application
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { platform, homedir } from 'os';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, symlinkSync } from 'fs';
import { PORTS, getDashboardUrl, getProxyUrl, getDashboardApiUrl } from '../config/ports.js';
import { nanoid } from 'nanoid';
import { isCertificateInstalled } from './certificate-manager.js';
import type { ChildProcess } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Create a session directory with timestamp-based naming
 */
function createSessionDirectory(logsDir: string): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');

	const logDirKey = `${year}-${month}-${day}__${hours}-${minutes}-${seconds}`;
	return join(logsDir, `session_${logDirKey}`);
}

/**
 * Check if a port is in use using OS-specific commands
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if port is in use
 */
async function checkPortInUse(port: number): Promise<boolean> {
	try {
		const currentPlatform = platform();
		let command;

		switch (currentPlatform) {
			case 'darwin':
			case 'linux':
				// Only check for LISTEN state (servers), not connections
				command = `lsof -i :${port} -s TCP:LISTEN`;
				break;
			case 'win32':
				// On Windows, only check for LISTENING state
				try {
					const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
						encoding: 'utf8'
					});
					return output.trim().length > 0;
				} catch {
					return false;
				}
			default:
				// Fallback for unknown platforms - assume port is available
				return false;
		}

		execSync(command, { stdio: 'ignore' });
		return true; // Command succeeded, port is in use
	} catch {
		return false; // Command failed, port is not in use
	}
}

/**
 * Check if Sushify ports are in use
 * @returns {Promise<{dashboardInUse: boolean, proxyInUse: boolean}>} Port usage status
 */
async function checkSushifyPorts() {
	const [dashboardInUse, proxyInUse] = await Promise.all([
		checkPortInUse(PORTS.DASHBOARD),
		checkPortInUse(PORTS.PROXY)
	]);

	return {
		dashboardInUse,
		proxyInUse
	};
}

/**
 * Get a temporary Docker Compose override file path
 * @returns {string} Path to temporary compose file in ~/.sushify/
 */
function getTempComposeFile() {
	const sushifyDir = join(homedir(), '.sushify');

	// Ensure .sushify directory exists
	if (!existsSync(sushifyDir)) {
		mkdirSync(sushifyDir, { recursive: true });
	}

	const filename = `docker-compose.sushify-${nanoid(8)}.yml`;
	return join(sushifyDir, filename);
}

// Process management with proper typing
interface ProcessManager {
	dashboard: ChildProcess | null;
	proxy: ChildProcess | null;
	userApp: ChildProcess | null;
	tempComposeFile: string | null;
}

const processes: ProcessManager = {
	dashboard: null,
	proxy: null,
	userApp: null,
	tempComposeFile: null
};

// Cleanup function
async function cleanup() {
	console.log('\n🛑 Shutting down Sushify...');

	if (processes.userApp) {
		console.log('🛑 Stopping user application...');
		processes.userApp.kill('SIGTERM');
	}

	if (processes.proxy) {
		console.log('🛑 Stopping proxy...');
		processes.proxy.kill('SIGTERM');
	}

	if (processes.dashboard) {
		console.log('🛑 Stopping dashboard...');
		processes.dashboard.kill('SIGTERM');
	}

	// Clean up temp Docker Compose file if it exists
	if (processes.tempComposeFile) {
		try {
			unlinkSync(processes.tempComposeFile);
			console.log(`🧹 Removed temp file: ${processes.tempComposeFile}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.log(`⚠️  Could not remove ${processes.tempComposeFile}: ${message}`);
		}
	}

	// Note: Certificate is left installed for future sessions

	console.log('✅ All services stopped');
	process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Check if required dependencies are available
 * @returns {Promise<boolean>}
 */
async function checkDependencies() {
	console.log('📦 Node.js:', process.version);

	// Check mitmproxy
	try {
		const result = await new Promise((resolve) => {
			const mitm = spawn('mitmdump', ['--version'], { stdio: 'pipe' });
			mitm.on('close', (code) => resolve(code === 0));
			mitm.on('error', () => resolve(false));

			// Timeout after 3 seconds
			setTimeout(() => {
				mitm.kill();
				resolve(false);
			}, 3000);
		});

		if (result) {
			console.log('✅ mitmproxy: Available');
			return true;
		} else {
			console.log('❌ mitmproxy: Not found');
			console.log('💡 Install with: python3 -m pip install mitmproxy');
			console.log('💡 Or run: sushify setup');
			return false;
		}
	} catch {
		console.log('❌ mitmproxy: Not found');
		console.log('💡 Install with: python3 -m pip install mitmproxy');
		console.log('💡 Or run: sushify setup');
		return false;
	}
}

/**
 * Start the SvelteKit dashboard in production mode
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startDashboard() {
	return new Promise((resolve, reject) => {
		console.log('🎛️  Starting Sushify dashboard...');

		const projectRoot = join(__dirname, '../../../../');
		const buildDir = join(projectRoot, 'build');

		// Check if build directory exists (for installed packages)
		if (existsSync(buildDir)) {
			console.log('✅ Using pre-built dashboard');
			startProductionServer(resolve, reject, projectRoot);
		} else {
			// Development mode - build first
			console.log('🔨 Building dashboard (development mode)...');
			const build = spawn('npm', ['run', 'build'], {
				cwd: projectRoot,
				stdio: 'pipe'
			});

			let buildOutput = '';
			build.stdout.on('data', (data) => {
				buildOutput += data.toString();
			});

			build.stderr.on('data', (data) => {
				const error = data.toString();
				if (error.includes('You are using Node.js')) {
					console.log('Dashboard build error:', error.trim());
					reject(new Error('Node.js version incompatible with Vite - please run "nvm use" first'));
					return;
				}
				buildOutput += error;
			});

			build.on('close', (code) => {
				if (code === 0) {
					console.log('✅ Dashboard built successfully');
					startProductionServer(resolve, reject, projectRoot);
				} else {
					console.log('❌ Dashboard build failed');
					console.log(buildOutput);
					reject(new Error(`Dashboard build failed with code ${code}`));
				}
			});

			build.on('error', (error) => {
				reject(new Error(`Dashboard build error: ${error.message}`));
			});
		}
	});
}

function startProductionServer(
	resolve: (value: ChildProcess) => void,
	reject: (reason: Error) => void,
	projectRoot: string
): void {
	// Start production server using adapter-node
	const server = spawn('node', ['build'], {
		cwd: projectRoot,
		stdio: 'pipe',
		env: {
			...process.env,
			PORT: PORTS.DASHBOARD.toString(),
			HOST: '0.0.0.0',
			ORIGIN: getDashboardUrl(),
			NODE_ENV: 'production'
		}
	});

	let dashboardReady = false;
	let startupOutput = '';

	const checkForReady = (output: string) => {
		startupOutput += output;
		// Look for SvelteKit adapter-node server startup indicators
		if (
			(output.includes('Listening on') ||
				output.includes('Server listening') ||
				output.includes(PORTS.DASHBOARD.toString()) ||
				output.includes(`0.0.0.0:${PORTS.DASHBOARD}`)) &&
			!dashboardReady
		) {
			dashboardReady = true;
			console.log(`✅ Dashboard running at: ${getDashboardUrl()}`);
			processes.dashboard = server;
			resolve(server);
		}
	};

	server.stdout.on('data', (data) => {
		const output = data.toString();
		checkForReady(output);
	});

	server.stderr.on('data', (data) => {
		const output = data.toString();
		startupOutput += output;
		// Some servers output startup info to stderr
		checkForReady(output);
	});

	server.on('close', (code) => {
		if (!dashboardReady) {
			console.log('Dashboard startup output:', startupOutput);
			reject(new Error(`Dashboard exited with code ${code}`));
		}
	});

	server.on('error', (error) => {
		reject(new Error(`Dashboard startup error: ${error.message}`));
	});

	// Timeout after 30 seconds
	setTimeout(() => {
		if (!dashboardReady) {
			server.kill();
			console.log('Dashboard startup output:', startupOutput);
			reject(new Error('Dashboard startup timeout'));
		}
	}, 30000);
}

/**
 * Start the mitmproxy with interceptor
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startProxy() {
	return new Promise((resolve, reject) => {
		console.log('🔗 Starting Sushify proxy...');

		const interceptorPath = join(__dirname, '../proxy/interceptor.py');

		const proxy = spawn(
			'mitmdump',
			['-s', interceptorPath, '-p', PORTS.PROXY.toString(), '--listen-host', '127.0.0.1'],
			{
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					SUSHIFY_DASHBOARD_URL: getDashboardUrl(),
					PYTHONUNBUFFERED: '1' // Force Python unbuffered output
				}
			}
		);

		let proxyReady = false;
		let startupLogs = '';

		proxy.stdout.on('data', (data) => {
			const output = data.toString();
			startupLogs += output;

			// Look for the specific mitmproxy startup message
			if (output.includes('HTTP(S) proxy listening') && !proxyReady) {
				console.log(`✅ Proxy running at: ${getProxyUrl()}`);
				proxyReady = true;
				processes.proxy = proxy;
				resolve(proxy);
			}
		});

		proxy.stderr.on('data', (data) => {
			const output = data.toString();
			startupLogs += output;
		});

		proxy.on('close', (code) => {
			if (!proxyReady) {
				console.log('❌ Proxy startup failed');
				console.log('Proxy logs:', startupLogs);
				reject(new Error(`Proxy exited with code ${code}`));
			}
		});

		proxy.on('error', (error) => {
			reject(new Error(`Proxy startup error: ${error.message}`));
		});

		// Timeout after 15 seconds
		setTimeout(() => {
			if (!proxyReady) {
				proxy.kill();
				reject(new Error('Proxy startup timeout'));
			}
		}, 15000);
	});
}

/**
 * Start user application with proxy configuration
 * @param {string} command - The command to run
 * @param {boolean} dockerMode - Force Docker Compose mode
 * @param {string[]} dockerServices - Services to auto-configure for proxy
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startUserApp(
	command: string,
	dockerMode = false,
	dockerServices: string[] = []
): Promise<ChildProcess> {
	return new Promise((resolve, reject) => {
		console.log(`🚀 Starting user application: ${command}`);

		if (dockerMode) {
			console.log('🐳 Docker Compose mode - configuring container proxy setup...');
			console.log(`🔍 Auto-configuring service: ${dockerServices[0]} (for LLM calls)`);
			return startDockerComposeApp(command, resolve, reject, dockerServices);
		} else {
			console.log('💻 Local mode - configuring direct proxy setup...');
			return startLocalApp(command, resolve, reject);
		}
	});
}

/**
 * Start local application with proxy environment variables
 * @param {string} command - The command to run
 * @param {Function} resolve - Promise resolver
 * @param {Function} reject - Promise rejector
 */
function startLocalApp(
	command: string,
	resolve: (value: ChildProcess) => void,
	reject: (reason: Error) => void
): void {
	// Parse command (handle quoted arguments)
	const args = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
	const cmd = args[0];
	const cmdArgs = args.slice(1).map((arg: string) => arg.replace(/^"|"$/g, ''));

	if (!cmd) {
		reject(new Error('Invalid command provided'));
		return;
	}

	// Set up environment with proxy configuration
	const env = {
		...process.env,
		HTTP_PROXY: getProxyUrl(),
		HTTPS_PROXY: getProxyUrl(),
		// Set certificate paths for different tools/languages
		SSL_CERT_FILE: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`, // Generic SSL cert
		REQUESTS_CA_BUNDLE: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`, // Python requests
		CURL_CA_BUNDLE: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`, // curl
		NODE_EXTRA_CA_CERTS: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`, // Node.js certificates
		// Enable native Node.js v23+ proxy support for fetch()
		NODE_USE_ENV_PROXY: '1'
	};

	const userApp = spawn(cmd, cmdArgs, {
		stdio: 'inherit',
		env: env,
		shell: false
	});

	userApp.on('spawn', () => {
		console.log('✅ User application started with proxy configuration');
		processes.userApp = userApp;
		resolve(userApp);
	});

	userApp.on('error', (/** @type {Error} */ error) => {
		reject(new Error(`Failed to start user application: ${error.message}`));
	});

	userApp.on('close', (/** @type {number | null} */ code) => {
		console.log(`\n📋 User application exited with code ${code}`);
		console.log('⏳ Waiting 2 seconds to ensure all exchanges are captured...');
		setTimeout(() => {
			cleanup();
		}, 2000);
	});

	// Monitor for potential Docker misconfiguration
	setTimeout(() => {
		checkForDockerMisconfiguration();
	}, 5000); // Check after 5 seconds
}

/**
 * Check for potential Docker misconfiguration in local mode
 */
async function checkForDockerMisconfiguration() {
	try {
		// Check if we have any exchanges captured yet
		const response = await fetch(`${getDashboardApiUrl()}/api/proxy/exchanges`);
		const data = /** @type {{ total?: number }} */ await response.json();

		// If no exchanges captured and compose files exist, suggest --docker flag
		if (data.total === 0 && hasDockerComposeFiles()) {
			console.log('');
			console.log('💡 Helpful hint:');
			console.log('   No network traffic captured yet, but docker-compose.yml was found.');
			console.log('   If your app runs in Docker containers, try:');
			console.log(`   sushify start --docker "${process.argv.slice(3).join(' ')}"`);
			console.log('');
		}
	} catch {
		// Ignore errors in this check - it's just a helpful hint
	}
}

/**
 * Check if Docker Compose files exist in current directory
 * @returns {boolean}
 */
function hasDockerComposeFiles() {
	const composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
	return composeFiles.some((file) => existsSync(file));
}

/**
 * Check if Docker Compose is available and compose files exist
 * @returns {boolean}
 */
function validateDockerSetup() {
	// Check if docker-compose command exists
	try {
		execSync('docker-compose --version', { stdio: 'ignore' });
	} catch {
		try {
			execSync('docker compose version', { stdio: 'ignore' });
		} catch {
			return false;
		}
	}

	// Check if compose files exist
	return hasDockerComposeFiles();
}

/**
 * Start Docker Compose application with proxy configuration
 * @param {string} command - The command to run
 * @param {Function} resolve - Promise resolver
 * @param {Function} reject - Promise rejector
 * @param {string[]} autoConfigServices - Services to auto-configure for proxy
 */
function startDockerComposeApp(
	command: string,
	resolve: (value: ChildProcess) => void,
	reject: (reason: Error) => void,
	autoConfigServices: string[] = []
): void {
	// Validate Docker setup first
	if (!validateDockerSetup()) {
		console.error('');
		console.error('❌ Docker Compose validation failed');
		console.error('');
		console.error('🔍 The --docker flag was used, but:');
		console.error('  • No docker-compose command found, OR');
		console.error('  • No compose files (docker-compose.yml) found in current directory');
		console.error('');
		console.error('💡 Solutions:');
		console.error('  1. Remove --docker flag: sushify start "' + command + '"');
		console.error('  2. Install Docker Compose: https://docs.docker.com/compose/install/');
		console.error('  3. Add docker-compose.yml to your project');
		console.error('');
		reject(new Error('Docker Compose validation failed'));
		return;
	}

	// Generate simple proxy override compose file
	let proxyOverride = `
# Auto-generated by Sushify - DO NOT EDIT
# This file configures your containers to use Sushify proxy on the host
version: '3.8'

services:`;

	// Add proxy configuration to the auto-configured service
	// Note: We only override environment and volumes, not build context
	const serviceName = autoConfigServices[0];
	proxyOverride += `
  # Proxy configuration for ${serviceName} service
  ${serviceName}:
    environment:
      # Proxy configuration
      HTTP_PROXY: http://host.docker.internal:${PORTS.PROXY}
      HTTPS_PROXY: http://host.docker.internal:${PORTS.PROXY}
      # Certificate configuration for different languages/tools
      SSL_CERT_FILE: /tmp/sushify-ca.pem                    # Generic SSL cert
      REQUESTS_CA_BUNDLE: /tmp/sushify-ca.pem              # Python requests
      CURL_CA_BUNDLE: /tmp/sushify-ca.pem                  # curl
      NODE_EXTRA_CA_CERTS: /tmp/sushify-ca.pem             # Node.js
      NODE_USE_ENV_PROXY: "1"                              # Node.js v23+ native proxy support
      SSL_CERT_DIR: /tmp/sushify-certs                     # Some tools expect a directory
      PYTHONHTTPSVERIFY: "1"                               # Python HTTPS verification
    volumes:
      - ${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem:/tmp/sushify-ca.pem:ro
      - ${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem:/tmp/sushify-certs/ca-cert.pem:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
`;

	// Write the override file to temp location
	const tempComposeFile = getTempComposeFile();
	writeFileSync(tempComposeFile, proxyOverride);
	processes.tempComposeFile = tempComposeFile;
	console.log(`📄 Generated ${tempComposeFile} with proxy configuration`);

	// Parse the original command and modify it
	let dockerCommand = command;

	// Add our override file to the docker-compose command
	if (dockerCommand.includes('docker-compose') || dockerCommand.includes('docker compose')) {
		// Put the original compose file first, then our override file
		// This ensures the build context is resolved from the original file's directory
		const fileFlags = dockerCommand.includes(' -f ')
			? ` -f ${tempComposeFile}`
			: ` -f docker-compose.yml -f ${tempComposeFile}`;
		dockerCommand = dockerCommand.replace(
			/(docker-compose|docker\s+compose)(\s+)/,
			`$1$2${fileFlags} `
		);
	}

	// Add profile to start the bridge service
	// Note: Temporarily disabled due to Docker Compose version compatibility
	// if (!dockerCommand.includes('--profile')) {
	//     dockerCommand += ' --profile sushify';
	// }

	console.log(`🐳 Running: ${dockerCommand}`);
	console.log(`✅ Service '${autoConfigServices[0]}' auto-configured for LLM proxy`);

	// Parse and execute the modified command
	const args = dockerCommand.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
	const cmd = args[0];
	const cmdArgs = args.slice(1).map((arg: string) => arg.replace(/^"|"$/g, ''));

	if (!cmd) {
		reject(new Error('Invalid Docker Compose command provided'));
		return;
	}

	/** @type {import('child_process').ChildProcess} */
	const userApp = spawn(cmd, cmdArgs, {
		stdio: 'inherit',
		shell: false
	});

	userApp.on('spawn', () => {
		console.log('✅ Docker Compose started with Sushify proxy bridge');
		processes.userApp = userApp;
		resolve(userApp);
	});

	userApp.on('error', (/** @type {Error} */ error) => {
		reject(new Error(`Failed to start Docker Compose: ${error.message}`));
	});

	userApp.on('close', (/** @type {number | null} */ code) => {
		console.log(`\n📋 Docker Compose exited with code ${code}`);
		console.log('🧹 Cleaning up generated files...');

		// Clean up generated override file
		if (processes.tempComposeFile) {
			try {
				unlinkSync(processes.tempComposeFile);
				console.log(`✅ Removed ${processes.tempComposeFile}`);
				processes.tempComposeFile = null;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(`⚠️  Could not remove ${processes.tempComposeFile}: ${message}`);
			}
		}

		console.log('⏳ Waiting 2 seconds to ensure all exchanges are captured...');
		setTimeout(() => {
			cleanup();
		}, 2000);
	});
}

/**
 * Wait for dashboard to be ready by checking health endpoint
 */
async function waitForDashboardReady() {
	const maxAttempts = 30; // 30 seconds max
	const delay = 1000; // 1 second between attempts

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			// Test the main API endpoints that the interceptor uses
			// Use IPv4 explicitly to avoid IPv6 connectivity issues
			const [statusResponse, exchangesResponse] = await Promise.all([
				fetch(`${getDashboardApiUrl()}/api/proxy/status`),
				fetch(`${getDashboardApiUrl()}/api/proxy/exchanges`)
			]);

			if (statusResponse.ok && exchangesResponse.ok) {
				console.log('✅ Dashboard is ready (all APIs responding)');
				return;
			}

			throw new Error('Dashboard APIs not ready');
		} catch (error) {
			// Dashboard APIs not ready yet, continue waiting
			if (attempt === maxAttempts) {
				const message = error instanceof Error ? error.message : String(error);
				console.log(`⚠️ Dashboard readiness check failed on attempt ${attempt}: ${message}`);
			}
		}

		if (attempt < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// If we get here, dashboard didn't start properly
	throw new Error(
		'Dashboard API endpoints not responding - all APIs must be ready before starting proxy'
	);
}

/**
 * Open the dashboard in the default browser
 */
function openDashboard() {
	const url = getDashboardUrl();
	const currentPlatform = platform();

	let command;
	switch (currentPlatform) {
		case 'darwin':
			command = 'open';
			break;
		case 'win32':
			command = 'start';
			break;
		default:
			command = 'xdg-open';
	}

	spawn(command, [url], { stdio: 'ignore' });
	console.log(`🌐 Opening dashboard: ${url}`);
}

/**
 * Main start function
 */
export async function startSushify(
	userCommand: string,
	dockerMode = false,
	dockerServices: string[] = []
): Promise<void> {
	console.log('🍣 Sushify - Turn your prompt salad into sushi');
	console.log('');

	// Create session directory and set up logging
	const sushifyHome = join(homedir(), '.sushify');
	const logsDir = join(sushifyHome, 'logs');

	// Create session directory
	const sessionDir = createSessionDirectory(logsDir);

	try {
		// Ensure session directory exists
		mkdirSync(sessionDir, { recursive: true });

		// Pre-create log files to verify writability
		const serverLogPath = join(sessionDir, 'server.log');
		const interceptorLogPath = join(sessionDir, 'interceptor.log');

		// Create empty log files (this tests writability)
		writeFileSync(serverLogPath, '');
		writeFileSync(interceptorLogPath, '');

		// Set up symlink to latest session
		const latestLink = join(logsDir, 'latest');
		try {
			if (existsSync(latestLink)) {
				unlinkSync(latestLink);
			}
			symlinkSync(sessionDir, latestLink);
		} catch {
			// Symlink creation might fail on some systems, that's okay
		}

		// Set environment variable for dashboard and interceptor
		process.env.SUSHIFY_SESSION_DIR = sessionDir;
	} catch (error) {
		console.error('❌ Failed to create session directory:');
		console.error(`   ${error instanceof Error ? error.message : String(error)}`);
		console.error('');
		console.error('💡 Please check that ~/.sushify directory is writable');
		process.exit(1);
	}

	try {
		// 1. Check if Sushify is already running
		console.log('🔍 Checking if Sushify is already running...');
		const portStatus = await checkSushifyPorts();

		if (portStatus.dashboardInUse || portStatus.proxyInUse) {
			console.error('');
			console.error('❌ Sushify appears to be already running!');
			console.error('');
			console.error('🔍 Port conflicts detected:');
			if (portStatus.dashboardInUse) {
				console.error(`  • Dashboard port ${PORTS.DASHBOARD} is in use`);
			}
			if (portStatus.proxyInUse) {
				console.error(`  • Proxy port ${PORTS.PROXY} is in use`);
			}
			console.error('');
			console.error('💡 Solutions:');
			console.error('  1. Stop the existing Sushify instance (Ctrl+C in its terminal)');
			console.error('  2. Kill processes using these ports:');

			const currentPlatform = platform();
			if (portStatus.dashboardInUse) {
				if (currentPlatform === 'win32') {
					console.error(
						`     for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORTS.DASHBOARD} ^| findstr LISTENING') do taskkill /PID %a /F`
					);
				} else {
					console.error(`     lsof -ti:${PORTS.DASHBOARD} -s TCP:LISTEN | xargs kill -9`);
				}
			}
			if (portStatus.proxyInUse) {
				if (currentPlatform === 'win32') {
					console.error(
						`     for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORTS.PROXY} ^| findstr LISTENING') do taskkill /PID %a /F`
					);
				} else {
					console.error(`     lsof -ti:${PORTS.PROXY} -s TCP:LISTEN | xargs kill -9`);
				}
			}
			console.error('  3. Wait a moment and try again');
			console.error('');
			process.exit(1);
		}

		// 2. Check dependencies
		console.log('🔍 Checking dependencies...');
		const depsOk = await checkDependencies();
		if (!depsOk) {
			console.error('❌ Dependencies check failed');
			process.exit(1);
		}

		// Display session directory
		console.log('📁 Session logs:', sessionDir);
		console.log('');

		// 3. Check if certificate is set up for HTTPS support
		try {
			if (!(await isCertificateInstalled())) {
				console.error('❌ HTTPS certificate not installed');
				console.error('');
				console.error('🔧 Sushify requires a certificate for secure traffic interception.');
				console.error('💡 Run this command first:');
				console.error('');
				console.error('   sushify setup');
				console.error('');
				console.error('This is a one-time setup that enables both HTTP and HTTPS interception.');
				process.exit(1);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('❌ Certificate check failed:', message);
			console.error('💡 Try running: sushify setup');
			process.exit(1);
		}

		console.log('');

		// 4. Start services in parallel
		// 4. Check analysis capability
		const analysisEnabled = !!process.env.OPENAI_API_KEY;
		if (analysisEnabled) {
			console.log('🍣 Prompt analysis enabled');
		} else {
			console.log('🎯 Running in capture-only mode');
			console.log('💡 Set OPENAI_API_KEY to enable prompt analysis');
		}

		console.log('');

		// 5. Start services in parallel
		console.log('🏗️  Starting Sushify services...');
		await Promise.all([startDashboard(), startProxy()]);

		// 6. Wait for dashboard to be fully ready
		// Wait for dashboard to be ready
		await waitForDashboardReady();

		console.log('');

		// 6. Start user application (now that everything is ready)
		console.log('🚀 Starting user application');
		await startUserApp(userCommand, dockerMode, dockerServices);

		// 7. Open browser
		openDashboard();

		console.log('');
		console.log('🎉 Sushify is running!');
		console.log(`📊 Dashboard: ${getDashboardUrl()}`);
		console.log(`🔗 Proxy: ${getProxyUrl()}`);
		console.log('');
		console.log('💡 All HTTP/HTTPS traffic from your app is being captured');
		console.log('💡 Press Ctrl+C to stop all services');
	} catch (error) {
		// Safely access error message
		const message =
			error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error';
		console.error('❌ Failed to start Sushify:', message);
		await cleanup();
		process.exit(1);
	}
}

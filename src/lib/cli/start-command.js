#!/usr/bin/env node

/**
 * Sushify Start Command Implementation
 * Orchestrates dashboard, proxy, and user application
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { platform } from 'os';
import { existsSync } from 'fs';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Process management with proper typing
/** @type {{ dashboard: import('child_process').ChildProcess | null, proxy: import('child_process').ChildProcess | null, userApp: import('child_process').ChildProcess | null }} */
let processes = {
	dashboard: null,
	proxy: null,
	userApp: null
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
 * Start the SvelteKit dashboard in preview mode
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startDashboard() {
	return new Promise((resolve, reject) => {
		console.log('🎛️  Starting Sushify dashboard...');

		const projectRoot = join(__dirname, '../../../');
		const buildDir = join(projectRoot, 'build');

		// Check if build directory exists (for installed packages)
		if (existsSync(buildDir)) {
			console.log('✅ Using pre-built dashboard');
			startPreviewServer(resolve, reject, projectRoot);
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
					startPreviewServer(resolve, reject, projectRoot);
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

function startPreviewServer(
	/** @type {(value: import('child_process').ChildProcess) => void} */ resolve,
	/** @type {(reason: Error) => void} */ reject,
	/** @type {string} */ projectRoot
) {
	// Start preview server
	const preview = spawn('npm', ['run', 'preview', '--', '--port', '3001'], {
		cwd: projectRoot,
		stdio: 'pipe'
	});

	let dashboardReady = false;
	let startupOutput = '';

	const checkForReady = (/** @type {string} */ output) => {
		startupOutput += output;
		// Look for vite preview server startup indicators
		if (
			(output.includes('Local:') ||
				output.includes('Network:') ||
				output.includes('localhost:3001') ||
				output.includes('preview') ||
				output.includes('3001')) &&
			!dashboardReady
		) {
			dashboardReady = true;
			console.log('✅ Dashboard running at: http://localhost:3001');
			processes.dashboard = preview;
			resolve(preview);
		}
	};

	preview.stdout.on('data', (data) => {
		const output = data.toString();
		checkForReady(output);
	});

	preview.stderr.on('data', (data) => {
		const output = data.toString();
		startupOutput += output;
		// Some servers output startup info to stderr
		checkForReady(output);
	});

	preview.on('close', (code) => {
		if (!dashboardReady) {
			console.log('Dashboard startup output:', startupOutput);
			reject(new Error(`Dashboard exited with code ${code}`));
		}
	});

	preview.on('error', (error) => {
		reject(new Error(`Dashboard startup error: ${error.message}`));
	});

	// Timeout after 30 seconds
	setTimeout(() => {
		if (!dashboardReady) {
			preview.kill();
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

		const proxy = spawn('mitmdump', ['-s', interceptorPath, '--listen-port', '8080'], {
			stdio: 'pipe'
		});

		let proxyReady = false;
		let startupLogs = '';

		proxy.stdout.on('data', (data) => {
			const output = data.toString();
			startupLogs += output;

			// Look for the specific mitmproxy startup message
			if (output.includes('HTTP(S) proxy listening') && !proxyReady) {
				console.log('✅ Proxy running at: http://localhost:8080');
				proxyReady = true;
				processes.proxy = proxy;
				resolve(proxy);
			}
		});

		proxy.stderr.on('data', (data) => {
			startupLogs += data.toString();
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
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startUserApp(command) {
	return new Promise((resolve, reject) => {
		console.log(`🚀 Starting user application: ${command}`);

		// Parse command (handle quoted arguments)
		const args = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
		const cmd = args[0];
		const cmdArgs = args.slice(1).map((arg) => arg.replace(/^"|"$/g, ''));

		if (!cmd) {
			reject(new Error('Invalid command provided'));
			return;
		}

		// Set up environment with proxy configuration
		const env = {
			...process.env,
			HTTP_PROXY: 'http://localhost:8080',
			HTTPS_PROXY: 'http://localhost:8080',
			// Set certificate paths for different tools
			SSL_CERT_FILE: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`,
			REQUESTS_CA_BUNDLE: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`,
			CURL_CA_BUNDLE: `${process.env.HOME}/.mitmproxy/mitmproxy-ca-cert.pem`
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
			const [statusResponse, exchangesResponse] = await Promise.all([
				fetch('http://localhost:3001/api/proxy/status'),
				fetch('http://localhost:3001/api/proxy/exchanges')
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
	const url = 'http://localhost:3001';
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
 * @param {string} userCommand - The user's application command to start with proxy
 */
export default async function startSushify(userCommand) {
	console.log('🍣 Sushify - Turn your prompt salad into sushi');
	console.log('');

	try {
		// 1. Check dependencies
		console.log('🔍 Checking dependencies...');
		const depsOk = await checkDependencies();
		if (!depsOk) {
			process.exit(1);
		}

		// 2. Check if certificate is set up for HTTPS support
		try {
			const { isCertificateInstalled } = await import('../proxy/certificate-manager.js');
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

		// 3. Start services in parallel
		console.log('🏗️  Starting Sushify services...');
		await Promise.all([startDashboard(), startProxy()]);

		// 4. Wait for dashboard to be fully ready
		await waitForDashboardReady();

		console.log('');

		// 5. Start user application (now that everything is ready)
		await startUserApp(userCommand);

		// 6. Open browser
		openDashboard();

		console.log('');
		console.log('🎉 Sushify is running!');
		console.log('📊 Dashboard: http://localhost:3001');
		console.log('🔗 Proxy: http://localhost:8080');
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

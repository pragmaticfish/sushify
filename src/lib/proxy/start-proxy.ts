#!/usr/bin/env node

/**
 * Script to start mitmproxy with Sushify interceptor
 * Works with any language/process - just set HTTP_PROXY environment variable
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PORTS, getProxyUrl } from '../config/ports.js';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const interceptorPath = join(__dirname, 'interceptor.py');

// Check if interceptor exists
if (!existsSync(interceptorPath)) {
	console.error('❌ Interceptor script not found:', interceptorPath);
	process.exit(1);
}

console.log('🚀 Starting mitmproxy with Sushify interceptor...');
console.log('📍 Interceptor script:', interceptorPath);
console.log(`🔗 Proxy will be available at: ${getProxyUrl()}`);
console.log('🌐 mitmweb UI will be available at: http://localhost:8081');
console.log('');
console.log('🔑 This proxy works with ANY language/process:');
console.log(`   • Node.js: HTTP_PROXY=${getProxyUrl()} node app.js`);
console.log(`   • Python:  HTTP_PROXY=${getProxyUrl()} python app.py`);
console.log(`   • Go:      HTTP_PROXY=${getProxyUrl()} go run main.go`);
console.log(`   • curl:    curl -x localhost:${PORTS.PROXY} http://httpbin.org/get`);
console.log('');

// Check if mitmproxy is available
function checkMitmproxy() {
	return new Promise((resolve) => {
		const check = spawn('mitmproxy', ['--version'], { stdio: 'pipe' });
		check.on('close', (code) => {
			resolve(code === 0);
		});
		check.on('error', () => {
			resolve(false);
		});
	});
}

// Start mitmproxy with web interface and our interceptor script
async function startProxy() {
	const hasItmproxy = await checkMitmproxy();

	if (!hasItmproxy) {
		console.error('❌ mitmproxy not found!');
		console.error('');
		console.error('📦 Install mitmproxy:');
		console.error('   pip install mitmproxy');
		console.error('   # or');
		console.error('   brew install mitmproxy  # macOS');
		console.error('   # or visit: https://mitmproxy.org/');
		console.error('');
		process.exit(1);
	}

	console.log('✅ mitmproxy found, starting proxy...');

	const mitm = spawn(
		'mitmweb',
		[
			'--web-host',
			'0.0.0.0', // Allow external access to web UI
			'--web-port',
			'8081', // Web UI port
			'-p',
			PORTS.PROXY.toString(), // Proxy port
			'-s',
			interceptorPath, // Our interceptor script
			'--set',
			'confdir=~/.mitmproxy', // Config directory
			'--set',
			'web_open_browser=false' // Don't auto-open browser
		],
		{
			stdio: 'inherit'
		}
	);

	// Handle process termination
	mitm.on('close', (code) => {
		console.log(`\n🛑 mitmproxy exited with code ${code}`);
	});

	mitm.on('error', (error) => {
		console.error('❌ Failed to start mitmproxy:', error.message);
	});

	// Handle Ctrl+C
	process.on('SIGINT', () => {
		console.log('\n🛑 Stopping mitmproxy...');
		mitm.kill('SIGINT');
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		console.log('\n🛑 Stopping mitmproxy...');
		mitm.kill('SIGTERM');
		process.exit(0);
	});
}

// Export the function for use by other modules
export { startProxy };

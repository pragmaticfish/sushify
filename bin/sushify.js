#!/usr/bin/env node

/**
 * Sushify CLI Entry Point
 * Language-agnostic LLM prompt analysis tool
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get version from package.json
function getVersion() {
	try {
		const packagePath = join(__dirname, '..', 'package.json');
		const { version } = JSON.parse(readFileSync(packagePath, 'utf8'));
		return version;
	} catch {
		return 'unknown';
	}
}

// Main CLI function
async function main() {
	const args = process.argv.slice(2);
	const version = getVersion();

	// Show version
	if (args.includes('--version') || args.includes('-v')) {
		console.log(`sushify v${version}`);
		process.exit(0);
	}

	// Show help
	if (args.includes('--help') || args.includes('-h') || args.length === 0) {
		console.log(`
🍣 Sushify v${version} - Turn your prompt salad into sushi

Usage:
  sushify setup                  Check/install proxy dependencies (run once)

  sushify start <command>        Start app with Sushify capturing
  sushify cleanup                Remove certificates and cleanup
  sushify --version              Show version
  sushify --help                 Show this help

Examples:
  sushify setup                  First-time setup (includes certificate)
  sushify start "npm start"      Node.js project
  sushify start "python main.py"  Python project
  sushify cleanup                Remove certificate and cleanup  
  sushify start "go run main.go"  Go project
  sushify start "cargo run"     Rust project


Installation:
  npm install -g sushify         Install globally (recommended)

More info: https://github.com/pragmaticfish/sushify#readme
        `);
		process.exit(0);
	}

	// Handle setup command
	if (args[0] === 'setup') {
		console.log('🔧 Running proxy dependency setup...');

		try {
			const { spawn } = await import('child_process');
			const setupPath = join(__dirname, '..', 'scripts', 'setup-proxy.js');

			const setup = spawn('node', [setupPath], {
				stdio: 'inherit'
			});

			setup.on('close', (code) => {
				process.exit(code);
			});
		} catch (error) {
			console.error('❌ Failed to run setup:', error.message);
			process.exit(1);
		}

		return;
	}

	// Handle start command
	if (args[0] === 'start') {
		if (args.length < 2) {
			console.error('❌ Missing command to start');
			console.error('Usage: sushify start "your-command"');
			console.error('Examples:');
			console.error('  sushify start "npm start"');
			console.error('  sushify start "python main.py"');
			console.error('  sushify start "go run main.go"');
			process.exit(1);
		}

		const userCommand = args.slice(1).join(' ');
		console.log(`🚀 Starting Sushify with command: ${userCommand}`);

		try {
			const { default: startSushify } = await import('../src/lib/cli/start-command.js');
			await startSushify(userCommand);
		} catch (error) {
			console.error('❌ Failed to start Sushify:', error.message);
			process.exit(1);
		}

		return;
	}

	// Handle cleanup command
	if (args[0] === 'cleanup') {
		console.log('🧹 Cleaning up Sushify certificates and data...');

		try {
			const { removeCertificate } = await import('../src/lib/proxy/certificate-manager.js');
			await removeCertificate();
			console.log('✅ Cleanup complete');
		} catch (error) {
			console.error('❌ Cleanup failed:', error.message);
			console.log('');
			console.log('📋 Manual certificate removal (macOS):');
			console.log('1. Open "Keychain Access"');
			console.log('2. Search for "mitmproxy"');
			console.log('3. Delete the certificate');
			console.log('');
			console.log('📋 Manual certificate removal (Linux):');
			console.log('sudo rm -f /usr/local/share/ca-certificates/mitmproxy-ca-cert.crt');
			console.log('sudo update-ca-certificates');
		}

		return;
	}

	// For now, just show that other commands are coming
	console.log('🍣 Sushify CLI is working!');
	console.log('Arguments:', args);
	console.log('\n⚠️  Implementation coming soon...');
	console.log('\n💡 Available commands:');
	console.log('  sushify setup     - Configure dependencies');
	console.log('  sushify start "command" - Start with Sushify');
	console.log('  sushify cleanup   - Remove certificates');
}

// Run the CLI
main().catch((error) => {
	console.error('❌ Sushify encountered an error:');
	console.error(error.message);
	process.exit(1);
});

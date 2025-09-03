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
  sushify setup                     Check/install proxy dependencies (run once)

  sushify start <command>              Start app with Sushify capturing
  sushify start --docker=<service> <command> Docker mode (auto-config specific service that makes LLM calls)
  sushify cleanup                   Remove certificates and cleanup
  sushify --version                 Show version
  sushify --help                    Show this help

Examples:
  sushify setup                        First-time setup (includes certificate)
  sushify start "npm start"            Local Node.js application
  sushify start "python main.py"       Local Python application
  sushify start --docker=backend "docker-compose up"   Docker with backend service
  sushify start --docker=ai-service "docker-compose up" Docker with AI service
  sushify cleanup                      Remove certificate and cleanup


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
		let dockerMode = false;
		let dockerServices = [];
		let commandArgs = args.slice(1);

		// Check for --docker flag with service specification
		if (commandArgs[0] && commandArgs[0].startsWith('--docker')) {
			if (commandArgs[0].includes('=')) {
				const serviceName = commandArgs[0].split('=')[1];
				if (serviceName) {
					dockerMode = true;
					dockerServices = [serviceName];
				} else {
					console.error('❌ Service name required with --docker flag');
					console.error('Usage: sushify start --docker=servicename "your-command"');
					process.exit(1);
				}
			} else {
				console.error('❌ Service name required with --docker flag');
				console.error('Usage: sushify start --docker=servicename "your-command"');
				console.error('Example: sushify start --docker=backend "docker-compose up"');
				process.exit(1);
			}

			commandArgs = commandArgs.slice(1);
		}

		if (commandArgs.length < 1) {
			console.error('❌ Missing command to start');
			console.error('Usage: sushify start [--docker=service] "your-command"');
			console.error('Examples:');
			console.error('  sushify start "npm start"');
			console.error('  sushify start "python main.py"');
			console.error('  sushify start --docker=backend "docker-compose up"');
			process.exit(1);
		}

		const userCommand = commandArgs.join(' ');

		// Display LLM provider configuration
		const customProvider = process.env.LLM_PROVIDER_BASE_URL;
		if (customProvider) {
			const trimmed = customProvider.trim();
			if (!trimmed) {
				console.error(`❌ LLM_PROVIDER_BASE_URL cannot be empty`);
				process.exit(1);
			}

			console.log(`🔧 Using custom LLM provider: ${trimmed}`);
			console.log(`   (Only POST requests matching this URL pattern will be captured)`);
		} else {
			console.log('🎯 Monitoring default AI providers: OpenAI, Anthropic, Google');
		}

		console.log(`🚀 Starting Sushify with command: ${userCommand}`);

		try {
			const { default: startSushify } = await import('../build/lib/cli/start-command.js');
			await startSushify(userCommand, dockerMode, dockerServices);
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

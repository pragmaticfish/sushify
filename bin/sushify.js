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
  sushify init                   Interactive setup (run in project directory)
  sushify start <command>        Start app with Sushify capturing
  sushify --version              Show version
  sushify --help                 Show this help

Examples:
  sushify start "npm start"      Node.js project
  sushify start "python main.py"  Python project  
  sushify start "go run main.go"  Go project
  sushify start "cargo run"     Rust project
  sushify init                   Set up in current project


More info: https://github.com/pragmaticfish/sushify#readme
        `);
		process.exit(0);
	}

	// For now, just show that the CLI is working
	console.log('🍣 Sushify CLI is working!');
	console.log('Arguments:', args);
	console.log('\n⚠️  Implementation coming soon...');
}

// Run the CLI
main().catch((error) => {
	console.error('❌ Sushify encountered an error:');
	console.error(error.message);
	process.exit(1);
});

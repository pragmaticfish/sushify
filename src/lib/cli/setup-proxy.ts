#!/usr/bin/env node

/**
 * Setup script for Sushify proxy dependencies
 * Checks for Python 3 and mitmproxy, offers installation guidance
 */

import { spawn, execSync } from 'child_process';
import { platform } from 'os';
import { installCertificate, certificateExists } from './certificate-manager.js';

const MINIMUM_PYTHON_VERSION = [3, 8]; // Python 3.8+

// Check if we're running in CI environment (skip setup entirely)
const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.CONTINUOUS_INTEGRATION;

if (isCI) {
	console.log('🤖 Running in CI environment, skipping interactive setup');
	console.log('💡 Run "sushify setup" manually when ready');
	process.exit(0);
}

console.log('🔍 Checking Sushify proxy dependencies...');

/**
 * Check if a command exists in the system
 */
function commandExists(command: string): boolean {
	try {
		execSync(`which ${command}`, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get Python version
 */
function getPythonVersion(pythonCmd: string): number[] | null {
	try {
		const output = execSync(`${pythonCmd} --version`, { encoding: 'utf8' });
		const match = output.match(/Python (\d+)\.(\d+)\.(\d+)/);
		if (match) {
			return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
		}
	} catch {
		return null;
	}
	return null;
}

/**
 * Check if version meets minimum requirements
 */
function versionMeetsRequirement(version: number[] | null, minimum: number[]): boolean {
	if (!version) return false;

	for (let i = 0; i < minimum.length; i++) {
		if (version[i] > minimum[i]) return true;
		if (version[i] < minimum[i]) return false;
	}
	return true;
}

/**
 * Check if mitmproxy is installed
 */
function checkMitmproxy() {
	return commandExists('mitmproxy') && commandExists('mitmweb');
}

/**
 * Install certificate with clear messaging
 */
async function installCertificateForSetup() {
	console.log('');
	console.log('🔐 Setting up HTTPS certificate for development...');
	console.log('');
	console.log('📋 Why is this needed?');
	console.log('   • Sushify intercepts HTTPS traffic to analyze AI API calls');
	console.log('   • A certificate must be trusted by your system for this to work');
	console.log("   • This is a one-time setup - you won't be asked again");
	console.log('   • The certificate is only used when Sushify proxy is running');
	console.log('');
	console.log('🔒 Security notes:');
	console.log('   • Certificate only works with Sushify proxy (localhost:8080)');
	console.log('   • Cannot intercept traffic without explicit proxy configuration');
	console.log('   • Same approach used by Charles, Fiddler, and other dev tools');
	console.log('   • Can be removed anytime with: sushify cleanup');
	console.log('');

	// Check if already installed
	if (certificateExists()) {
		try {
			// Try to install (this will check if it's already in trust store)
			// Try to install (this will check if it's already in trust store)
			await installCertificate();
			console.log('✅ HTTPS certificate configured successfully');
			console.log('✅ HTTPS certificate configured successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.log('⚠️  Certificate setup failed:', errorMessage);
			console.log('💡 HTTPS traffic may not be captured properly');
			console.log('💡 You can try again after fixing the issue with: sushify setup');
		}
	} else {
		console.log('⚠️  mitmproxy certificate not found');
		console.log('💡 Certificate will be generated on first use');
	}

	console.log('');
}

/**
 * Main setup function
 */
async function setupProxy() {
	let pythonCmd = null;

	// Check for Python 3
	console.log('🐍 Checking for Python 3...');

	const pythonCommands = ['python3', 'python'];
	for (const cmd of pythonCommands) {
		if (commandExists(cmd)) {
			const version = getPythonVersion(cmd);
			if (versionMeetsRequirement(version, MINIMUM_PYTHON_VERSION)) {
				pythonCmd = cmd;
				console.log(`✅ Found ${cmd} ${version!.join('.')}`);
				break;
			} else if (version) {
				console.log(
					`⚠️  Found ${cmd} ${version.join('.')} (requires ${MINIMUM_PYTHON_VERSION.join('.')}+)`
				);
			}
		}
	}

	if (!pythonCmd) {
		console.log('❌ Python 3.8+ not found');
		showPythonInstallInstructions();
		return false;
	}

	// Check for mitmproxy
	console.log('🔍 Checking for mitmproxy...');

	if (checkMitmproxy()) {
		console.log('✅ mitmproxy found');

		// Install certificate for HTTPS support
		await installCertificateForSetup();

		console.log('🎉 All proxy dependencies are ready!');
		return true;
	}

	console.log('❌ mitmproxy not found');

	// Offer to install mitmproxy
	console.log('📦 Installing mitmproxy...');

	try {
		const installResult = await installMitmproxy(pythonCmd);
		if (installResult) {
			console.log('✅ mitmproxy installed successfully!');
			console.log('🎉 All proxy dependencies are ready!');
			return true;
		} else {
			showMitmproxyInstallInstructions();
			return false;
		}
	} catch {
		console.log('❌ Failed to install mitmproxy automatically');
		showMitmproxyInstallInstructions();
		return false;
	}
}

/**
 * Install mitmproxy using pip
 */
function installMitmproxy(pythonCmd: string): Promise<boolean> {
	return new Promise((resolve) => {
		console.log(`Running: ${pythonCmd} -m pip install mitmproxy requests`);

		const install = spawn(pythonCmd, ['-m', 'pip', 'install', 'mitmproxy', 'requests'], {
			stdio: 'inherit'
		});

		install.on('close', (code) => {
			resolve(code === 0);
		});

		install.on('error', () => {
			resolve(false);
		});
	});
}

/**
 * Show Python installation instructions
 */
function showPythonInstallInstructions() {
	console.log('');
	console.log('📋 Python 3.8+ Installation Instructions:');
	console.log('');

	const os = platform();
	switch (os) {
		case 'darwin': // macOS
			console.log('🍎 macOS:');
			console.log('   brew install python');
			console.log('   # or download from: https://www.python.org/downloads/');
			break;

		case 'linux':
			console.log('🐧 Linux:');
			console.log('   sudo apt update && sudo apt install python3 python3-pip  # Ubuntu/Debian');
			console.log('   sudo yum install python3 python3-pip                    # CentOS/RHEL');
			console.log('   sudo dnf install python3 python3-pip                    # Fedora');
			break;

		case 'win32':
			console.log('🪟 Windows:');
			console.log('   Download from: https://www.python.org/downloads/');
			console.log('   Make sure to check "Add Python to PATH" during installation');
			break;

		default:
			console.log('Visit: https://www.python.org/downloads/');
	}

	console.log('');
	console.log('After installing Python, run: sushify setup');
}

/**
 * Show mitmproxy installation instructions
 */
function showMitmproxyInstallInstructions() {
	console.log('');
	console.log('📋 Manual mitmproxy Installation:');
	console.log('');
	console.log('   pip install mitmproxy');
	console.log('   # or');
	console.log('   pip3 install mitmproxy');
	console.log('');

	const os = platform();
	if (os === 'darwin') {
		console.log('🍎 macOS alternative:');
		console.log('   brew install mitmproxy');
		console.log('');
	}

	console.log('More info: https://docs.mitmproxy.org/stable/overview/installation/');
	console.log('');
	console.log('After installing, run: npm run setup-proxy');
}

// Run setup
setupProxy()
	.then((success) => {
		if (success) {
			console.log('');
			console.log('🚀 Setup complete! You can now use:');
			console.log('   sushify start "your-command"  # Start with Sushify');
		} else {
			process.exit(1);
		}
	})
	.catch((error) => {
		console.error('❌ Setup failed:', error);
		process.exit(1);
	});

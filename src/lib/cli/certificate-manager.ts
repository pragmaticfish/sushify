#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';

// Certificate paths
const MITMPROXY_DIR = join(homedir(), '.mitmproxy');
const CERT_FILE = join(MITMPROXY_DIR, 'mitmproxy-ca-cert.pem');

/**
 * Check if mitmproxy certificate exists
 */
export function certificateExists(): boolean {
	return existsSync(CERT_FILE);
}

/**
 * Check if certificate is already installed in system trust store
 */
export async function isCertificateInstalled(): Promise<boolean> {
	if (!certificateExists()) {
		return false;
	}

	const currentPlatform = platform();

	try {
		switch (currentPlatform) {
			case 'darwin':
				return await checkCertificateMacOS();
			case 'linux':
				return await checkCertificateLinux();
			case 'win32':
				return await checkCertificateWindows();
			default:
				return false;
		}
	} catch {
		return false;
	}
}

/**
 * Generate mitmproxy certificate by starting and stopping mitmproxy
 * @returns {Promise<boolean>} - Returns true if certificate was generated successfully
 */
export async function generateCertificate(): Promise<void> {
	console.log('🔐 Generating mitmproxy certificate...');

	// Ensure .mitmproxy directory exists
	if (!existsSync(MITMPROXY_DIR)) {
		mkdirSync(MITMPROXY_DIR, { recursive: true });
	}

	return new Promise((resolve, reject) => {
		// Start mitmproxy briefly to generate certificate
		const mitm = spawn('mitmdump', ['--version'], {
			stdio: 'pipe'
		});

		const timeout = setTimeout(() => {
			mitm.kill();
			if (certificateExists()) {
				console.log('✅ Certificate generated successfully');
				resolve(undefined);
			} else {
				console.error('❌ Failed to generate certificate');
				reject(
					new Error('Certificate generation timeout - mitmproxy may not be installed properly')
				);
			}
		}, 3000);

		mitm.on('close', () => {
			clearTimeout(timeout);
			if (certificateExists()) {
				console.log('✅ Certificate generated successfully');
				resolve(undefined);
			} else {
				console.error('❌ Failed to generate certificate');
				reject(
					new Error('Certificate generation failed - mitmproxy exited without creating certificate')
				);
			}
		});

		mitm.on('error', (error) => {
			clearTimeout(timeout);
			console.error(`❌ Failed to generate certificate: ${error.message}`);
			reject(new Error(`Certificate generation failed: ${error.message}`));
		});
	});
}

/**
 * Install certificate to system trust store
 * @returns {Promise<boolean>} - Returns true if certificate was installed successfully
 */
export async function installCertificate(): Promise<void> {
	try {
		if (!certificateExists()) {
			await generateCertificate();
		}

		// Check if certificate is already installed in system trust store
		if (await isCertificateInstalled()) {
			console.log('✅ Certificate already installed in system trust store');
			return;
		}

		console.log('🔐 Installing mitmproxy certificate to system trust store...');
		console.log('💡 This requires administrator privileges to add the certificate');
		console.log('');
		console.log('ℹ️  You may see a security warning - this is normal!');
		console.log(
			'ℹ️  The certificate is only used for HTTPS traffic interception during development'
		);
		console.log(
			'ℹ️  It will remain installed for future Sushify sessions (use "sushify cleanup" to remove)'
		);
		console.log('');

		const currentPlatform = platform();

		switch (currentPlatform) {
			case 'darwin':
				await installCertificateMacOS();
				break;
			case 'win32':
				await installCertificateWindows();
				break;
			case 'linux':
				await installCertificateLinux();
				break;
			default:
				throw new Error(`Unsupported platform: ${currentPlatform}`);
		}

		console.log('✅ Certificate installed successfully');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('❌ Certificate installation failed:', errorMessage);
		console.log('');
		console.log('📋 To fix certificate issues:');
		console.log('1. Make sure you have administrator privileges');
		console.log('2. Ensure Python 3.8+ and mitmproxy are installed correctly');
		console.log('3. Try running: python3 -m pip install mitmproxy');
		console.log('4. Restart your terminal and try again');
		console.log('');
		console.log('💡 Without the certificate, HTTPS traffic cannot be intercepted');
		console.log('💡 You can still capture HTTP traffic, but not HTTPS (like OpenAI API calls)');

		// Re-throw the error so caller knows it failed
		throw error;
	}
}

/**
 * Install certificate on macOS
 * @returns {Promise<void>}
 */
async function installCertificateMacOS() {
	return new Promise<void>((resolve, reject) => {
		console.log('🍎 Installing certificate on macOS...');
		console.log('🔐 You will be prompted for your password');
		console.log(
			'⚠️  A security dialog will appear - click "Use Password..." and enter your password'
		);

		const security = spawn(
			'sudo',
			[
				'security',
				'add-trusted-cert',
				'-d',
				'-r',
				'trustRoot',
				'-k',
				'/Library/Keychains/System.keychain',
				CERT_FILE
			],
			{
				stdio: 'inherit'
			}
		);

		security.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Certificate installation failed with exit code ${code}`));
			}
		});

		security.on('error', (error) => {
			reject(new Error(`Failed to install certificate: ${error.message}`));
		});
	});
}

/**
 * Install certificate on Windows
 * @returns {Promise<void>}
 */
async function installCertificateWindows() {
	return new Promise<void>((resolve, reject) => {
		console.log('🪟 Installing certificate on Windows...');
		console.log('🔐 You may be prompted for administrator privileges');

		// Use PowerShell to install certificate
		const powershell = spawn(
			'powershell',
			[
				'-Command',
				`Import-Certificate -FilePath "${CERT_FILE}" -CertStoreLocation "Cert:\\LocalMachine\\Root"`
			],
			{
				stdio: 'inherit'
			}
		);

		powershell.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Certificate installation failed with exit code ${code}`));
			}
		});

		powershell.on('error', (error) => {
			reject(new Error(`Failed to install certificate: ${error.message}`));
		});
	});
}

/**
 * Install certificate on Linux
 * @returns {Promise<void>}
 */
async function installCertificateLinux() {
	return new Promise<void>((resolve, reject) => {
		console.log('🐧 Installing certificate on Linux...');
		console.log('🔐 You will be prompted for your password');

		// Copy certificate to system trust store
		const cp = spawn(
			'sudo',
			['cp', CERT_FILE, '/usr/local/share/ca-certificates/mitmproxy-ca-cert.crt'],
			{
				stdio: 'inherit'
			}
		);

		cp.on('close', (code) => {
			if (code === 0) {
				// Update certificate store
				const updateCerts = spawn('sudo', ['update-ca-certificates'], {
					stdio: 'inherit'
				});

				updateCerts.on('close', (updateCode) => {
					if (updateCode === 0) {
						resolve();
					} else {
						reject(new Error(`Certificate update failed with exit code ${updateCode}`));
					}
				});

				updateCerts.on('error', (error) => {
					reject(new Error(`Failed to update certificates: ${error.message}`));
				});
			} else {
				reject(new Error(`Certificate copy failed with exit code ${code}`));
			}
		});

		cp.on('error', (error) => {
			reject(new Error(`Failed to copy certificate: ${error.message}`));
		});
	});
}

/**
 * Remove certificate from system trust store and clean up
 * @returns {Promise<void>}
 */
export async function removeCertificate() {
	console.log('🧹 Removing mitmproxy certificate from system...');

	const currentPlatform = platform();

	try {
		switch (currentPlatform) {
			case 'darwin':
				await removeCertificateMacOS();
				break;
			case 'win32':
				await removeCertificateWindows();
				break;
			case 'linux':
				await removeCertificateLinux();
				break;
			default:
				console.log(`⚠️  Certificate removal not supported on ${currentPlatform}`);
		}

		console.log('✅ Certificate cleanup complete');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.warn('⚠️ Certificate removal failed (this is usually okay):', errorMessage);
	}
}

/**
 * Remove certificate on macOS
 * @returns {Promise<void>}
 */
async function removeCertificateMacOS() {
	return new Promise<void>((resolve) => {
		// Find and remove the certificate
		const security = spawn(
			'sudo',
			['security', 'delete-certificate', '-c', 'mitmproxy', '/Library/Keychains/System.keychain'],
			{
				stdio: 'pipe' // Don't show errors for certificate not found
			}
		);

		security.on('close', () => {
			resolve(); // Always resolve, certificate might not exist
		});

		security.on('error', () => {
			resolve(); // Always resolve, certificate might not exist
		});
	});
}

/**
 * Remove certificate on Windows
 * @returns {Promise<void>}
 */
async function removeCertificateWindows() {
	return new Promise<void>((resolve) => {
		const powershell = spawn(
			'powershell',
			[
				'-Command',
				`Get-ChildItem -Path "Cert:\\LocalMachine\\Root" | Where-Object {$_.Subject -like "*mitmproxy*"} | Remove-Item`
			],
			{
				stdio: 'pipe'
			}
		);

		powershell.on('close', () => {
			resolve(); // Always resolve, certificate might not exist
		});

		powershell.on('error', () => {
			resolve(); // Always resolve, certificate might not exist
		});
	});
}

/**
 * Remove certificate on Linux
 * @returns {Promise<void>}
 */
async function removeCertificateLinux() {
	return new Promise<void>((resolve) => {
		const rm = spawn(
			'sudo',
			['rm', '-f', '/usr/local/share/ca-certificates/mitmproxy-ca-cert.crt'],
			{
				stdio: 'pipe'
			}
		);

		rm.on('close', () => {
			// Update certificate store
			const updateCerts = spawn('sudo', ['update-ca-certificates'], {
				stdio: 'pipe'
			});

			updateCerts.on('close', () => {
				resolve();
			});

			updateCerts.on('error', () => {
				resolve();
			});
		});

		rm.on('error', () => {
			resolve(); // Always resolve, certificate might not exist
		});
	});
}

/**
 * Check if certificate is installed on macOS
 * @returns {Promise<boolean>}
 */
async function checkCertificateMacOS(): Promise<boolean> {
	return new Promise((resolve) => {
		const security = spawn(
			'security',
			['find-certificate', '-c', 'mitmproxy', '/Library/Keychains/System.keychain'],
			{
				stdio: 'pipe'
			}
		);

		security.on('close', (code) => {
			resolve(code === 0);
		});

		security.on('error', () => {
			resolve(false);
		});
	});
}

/**
 * Check if certificate is installed on Linux
 * @returns {Promise<boolean>}
 */
async function checkCertificateLinux(): Promise<boolean> {
	return new Promise((resolve) => {
		const ls = spawn('ls', ['/usr/local/share/ca-certificates/mitmproxy-ca-cert.crt'], {
			stdio: 'pipe'
		});

		ls.on('close', (code) => {
			resolve(code === 0);
		});

		ls.on('error', () => {
			resolve(false);
		});
	});
}

/**
 * Check if certificate is installed on Windows
 * @returns {Promise<boolean>}
 */
async function checkCertificateWindows(): Promise<boolean> {
	return new Promise((resolve) => {
		const powershell = spawn(
			'powershell',
			[
				'-Command',
				`Get-ChildItem -Path "Cert:\\LocalMachine\\Root" | Where-Object {$_.Subject -like "*mitmproxy*"}`
			],
			{
				stdio: 'pipe'
			}
		);

		let output = '';
		powershell.stdout.on('data', (data) => {
			output += data.toString();
		});

		powershell.on('close', () => {
			resolve(output.includes('mitmproxy'));
		});

		powershell.on('error', () => {
			resolve(false);
		});
	});
}

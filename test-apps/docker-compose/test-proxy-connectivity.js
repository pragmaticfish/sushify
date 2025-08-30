#!/usr/bin/env node

// Simple test to check if container can reach proxy bridge
const http = require('http');

console.log('🧪 Testing proxy bridge connectivity...');
console.log('Environment variables:');
console.log('  HTTPS_PROXY:', process.env.HTTPS_PROXY || 'not set');
console.log('  HTTP_PROXY:', process.env.HTTP_PROXY || 'not set');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

if (!proxyUrl) {
	console.log('❌ No proxy URL set');
	process.exit(1);
}

// Parse proxy URL
const url = new URL(proxyUrl);
console.log(`🔍 Testing connection to proxy bridge: ${url.hostname}:${url.port}`);

// Test basic TCP connection to proxy bridge
const req = http.request(
	{
		hostname: url.hostname,
		port: url.port,
		method: 'GET',
		path: '/',
		timeout: 5000
	},
	(res) => {
		console.log(`✅ Connected to proxy bridge: ${res.statusCode}`);
		console.log('Headers:', res.headers);
		res.on('data', (chunk) => {
			console.log('Response data:', chunk.toString());
		});
		res.on('end', () => {
			console.log('✅ Proxy bridge connectivity test completed');
			process.exit(0);
		});
	}
);

req.on('error', (error) => {
	console.error('❌ Connection failed:', error.message);
	process.exit(1);
});

req.on('timeout', () => {
	console.error('❌ Connection timeout');
	req.destroy();
	process.exit(1);
});

req.end();

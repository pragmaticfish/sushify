const express = require('express');

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'healthy', service: 'backend', timestamp: new Date().toISOString() });
});

// Test endpoint that makes external API calls (simulating LLM services)
app.get('/api/test', async (req, res) => {
	console.log('Making external API calls...');

	const results = [];

	try {
		// Test 1: HTTPBin (simulating external service)
		console.log('Calling httpbin.org...');
		const httpResponse = await fetch('https://httpbin.org/get');
		const httpData = await httpResponse.json();
		results.push({
			service: 'httpbin.org',
			status: httpResponse.status,
			url: httpData.url,
			userAgent: httpData.headers['User-Agent']
		});

		// Test 2: GitHub API (simulating LLM service)
		console.log('Calling GitHub API...');
		const githubResponse = await fetch('https://api.github.com/zen');
		const githubData = await githubResponse.text();
		results.push({
			service: 'github.com',
			status: githubResponse.status,
			message: githubData.trim()
		});

		// Test 3: JSONPlaceholder (simulating another API)
		console.log('Calling JSONPlaceholder...');
		const jsonResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1');
		const jsonData = await jsonResponse.json();
		results.push({
			service: 'jsonplaceholder.typicode.com',
			status: jsonResponse.status,
			title: jsonData.title,
			userId: jsonData.userId
		});

		console.log('All API calls completed successfully');
		res.json({
			success: true,
			timestamp: new Date().toISOString(),
			totalCalls: results.length,
			results: results
		});
	} catch (error) {
		console.error('API call failed:', error.message);
		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

// Continuous testing endpoint (makes calls every 3 seconds)
app.get('/api/continuous', (req, res) => {
	let callCount = 0;
	const maxCalls = 5;

	res.json({
		message: `Starting continuous testing (${maxCalls} calls every 3 seconds)`,
		checkLogs: 'Monitor container logs for API calls'
	});

	const interval = setInterval(async () => {
		callCount++;
		console.log(`Continuous test call #${callCount}/${maxCalls}`);

		try {
			const response = await fetch('https://httpbin.org/uuid');
			const data = await response.json();
			console.log(`Call #${callCount}: ${data.uuid}`);
		} catch (error) {
			console.error(`Call #${callCount} failed:`, error.message);
		}

		if (callCount >= maxCalls) {
			clearInterval(interval);
			console.log('Continuous testing completed');
		}
	}, 3000);
});

// Root endpoint
app.get('/', (req, res) => {
	res.json({
		message: 'Test Backend Service for Sushify Docker Proxy Testing',
		endpoints: {
			'/health': 'Health check',
			'/api/test': 'Make 3 external API calls',
			'/api/continuous': 'Start continuous testing (5 calls every 3s)'
		},
		timestamp: new Date().toISOString()
	});
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Backend service started on port ${PORT}`);
	console.log(`Available endpoints:`);
	console.log(`  GET /health          - Health check`);
	console.log(`  GET /api/test        - Test external API calls`);
	console.log(`  GET /api/continuous  - Continuous testing`);
	console.log(`  GET /                - Service info`);
});

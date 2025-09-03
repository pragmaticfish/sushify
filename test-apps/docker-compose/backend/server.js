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
		// Test 1: HTTPBin (NOT captured - regular API)
		console.log('Calling httpbin.org (NOT captured)...');
		const httpResponse = await fetch('https://httpbin.org/get');
		const httpData = await httpResponse.json();
		results.push({
			service: 'httpbin.org (NOT captured)',
			status: httpResponse.status,
			url: httpData.url,
			userAgent: httpData.headers['User-Agent']
		});

		// Test 2: GitHub API (NOT captured - regular API)
		console.log('Calling GitHub API (NOT captured)...');
		const githubResponse = await fetch('https://api.github.com/zen');
		const githubData = await githubResponse.text();
		results.push({
			service: 'github.com (NOT captured)',
			status: githubResponse.status,
			message: githubData.trim()
		});

		// Test 3: OpenAI GET API (NOT captured - AI domain but GET request)
		console.log('Calling OpenAI Models API (NOT captured - GET)...');
		const openaiGetResponse = await fetch('https://api.openai.com/v1/models');
		results.push({
			service: 'api.openai.com/v1/models (NOT captured - GET)',
			status: openaiGetResponse.status,
			message: 'OpenAI Models API call (GET request not captured)'
		});

		// Test 4: OpenAI POST API (CAPTURED - AI domain with conversation content)
		console.log('Calling OpenAI Chat API (CAPTURED - POST)...');
		const openaiPostResponse = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'gpt-4',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant. Never use emojis.' },
					{ role: 'user', content: 'Hello! ### Reminder: use emojis when appropriate.' }
				]
			})
		});
		results.push({
			service: 'api.openai.com/v1/chat/completions (CAPTURED)',
			status: openaiPostResponse.status,
			message: 'OpenAI Chat API call (POST with conversation - will be analyzed)'
		});

		// Test 5: Anthropic API (CAPTURED - AI domain with conversation content)
		console.log('Calling Anthropic API (CAPTURED - POST)...');
		const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'claude-3-sonnet-20240229',
				max_tokens: 100,
				messages: [{ role: 'user', content: 'Hello world' }]
			})
		});
		results.push({
			service: 'api.anthropic.com/v1/messages (CAPTURED)',
			status: anthropicResponse.status,
			message: 'Anthropic Messages API call (POST with conversation - will be analyzed)'
		});

		// Test 6: JSONPlaceholder (NOT captured - regular API)
		console.log('Calling JSONPlaceholder (NOT captured)...');
		const jsonResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1');
		const jsonData = await jsonResponse.json();
		results.push({
			service: 'jsonplaceholder.typicode.com (NOT captured)',
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
			'/api/test': 'Make 6 external API calls (2 AI POST captured, 4 not captured)',
			'/api/continuous': 'Start continuous testing (5 calls every 3s - NOT captured)'
		},
		note: 'Only AI domain POST requests with conversation content will be captured by Sushify',
		timestamp: new Date().toISOString()
	});
});

app.listen(PORT, '0.0.0.0', () => {
	console.log(`Backend service started on port ${PORT}`);
	console.log(`Available endpoints:`);
	console.log(`  GET /health          - Health check`);
	console.log(
		`  GET /api/test        - Test external API calls (2 AI POST captured, 4 not captured)`
	);
	console.log(`  GET /api/continuous  - Continuous testing (NOT captured)`);
	console.log(`  GET /                - Service info`);
});

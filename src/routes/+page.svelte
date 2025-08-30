<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { source } from 'sveltekit-sse';
	import type { Exchange, CaptureStatusResponse, ExchangesResponse } from '$lib/types';

	let capturing = false;
	let sessionId: string | null = null;
	let error: string | null = null;
	let exchanges: Exchange[] = [];
	let loading = false;

	// SSE connection
	let sseConnection: ReturnType<typeof source> | null = null;

	// Check capture status and setup SSE on page load
	onMount(() => {
		checkCaptureStatus();
		loadInitialExchanges();
		setupSSE();
	});

	// Cleanup SSE connection on destroy
	onDestroy(() => {
		if (sseConnection) {
			sseConnection.close();
		}
	});

	function setupSSE() {
		// Create SSE connection
		sseConnection = source('/api/proxy/stream');

		// Listen for new exchanges
		const exchangeStream = sseConnection.select('exchange');

		exchangeStream.subscribe((data) => {
			if (data) {
				try {
					const newExchange: Exchange = JSON.parse(data);
					// Add new exchange to the beginning of the array
					exchanges = [newExchange, ...exchanges];
				} catch (err) {
					console.error('Failed to parse exchange data:', err);
				}
			}
		});

		// Listen for connection events
		const connectionStream = sseConnection.select('connected');
		connectionStream.subscribe((data) => {
			if (data) {
				console.log('📡 SSE connected:', data);
			}
		});
	}

	async function checkCaptureStatus() {
		try {
			const response = await fetch('/api/proxy/status');
			if (response.ok) {
				const data: CaptureStatusResponse = await response.json();
				capturing = data.capturing;
				sessionId = data.sessionId;
			}
		} catch (err) {
			console.error('Failed to check capture status:', err);
		}
	}

	async function toggleCapture() {
		const action = capturing ? 'disable' : 'enable';
		error = null;

		try {
			const response = await fetch('/api/proxy/status', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ action })
			});

			if (response.ok) {
				const data = await response.json();
				capturing = data.capturing;
				sessionId = data.sessionId;

				console.log(`🍣 Sushify capturing: ${capturing ? 'ON' : 'OFF'}`);

				if (capturing) {
					console.log(`🟢 Started proxy capture - Session: ${sessionId}`);
				} else {
					console.log('🔴 Stopped proxy capture');
				}
			} else {
				throw new Error(`Server returned ${response.status}`);
			}
		} catch (err) {
			error = `Failed to ${action} capture: ${err instanceof Error ? err.message : String(err)}`;
			console.error('❌', error);
		}
	}

	async function loadInitialExchanges() {
		if (loading) return;

		try {
			loading = true;
			const response = await fetch('/api/proxy/exchanges');
			if (response.ok) {
				const data: ExchangesResponse = await response.json();
				exchanges = data.exchanges || [];
			}
		} catch (err) {
			console.error('Failed to load exchanges:', err);
		} finally {
			loading = false;
		}
	}

	function formatTime(timestamp: number) {
		return new Date(timestamp * 1000).toLocaleTimeString();
	}

	function getStatusEmoji(status: number) {
		if (status >= 200 && status < 300) return '✅';
		if (status >= 400 && status < 500) return '⚠️';
		if (status >= 500) return '❌';
		return '🔄';
	}

	function getDomainEmoji(url: string) {
		if (url.includes('api.openai.com')) return '🤖';
		if (url.includes('api.anthropic.com')) return '🤖';
		if (url.includes('api.cohere.ai')) return '🤖';
		return '🌐';
	}
</script>

<div class="sushify-dashboard">
	<header>
		<h1>🍣 Sushify Dashboard</h1>
		<p>Turn your prompt salad into sushi</p>
	</header>

	<main>
		<div class="capture-control">
			<button class="toggle-btn" class:active={capturing} on:click={toggleCapture}>
				{capturing ? '🟢 Capturing ON' : '⚫ Capturing OFF'}
			</button>

			{#if error}
				<p class="error">❌ {error}</p>
			{/if}

			<p class="status">
				{#if capturing && sessionId}
					✨ Proxy capturing enabled - Session: {sessionId}
				{:else if capturing}
					✨ Ready to capture HTTP traffic
				{:else}
					💤 Click to start proxy capture
				{/if}
			</p>
		</div>

		<div class="exchanges-section">
			<div class="section-header">
				<h2>📡 Captured Exchanges</h2>
				<div class="exchange-stats">
					{#if loading}
						<span class="loading">🔄 Loading...</span>
					{:else}
						<span class="count">{exchanges.length} total</span>
					{/if}
				</div>
			</div>

			{#if exchanges.length === 0}
				<div class="empty-state">
					<p>💤 No exchanges captured yet</p>
					{#if capturing}
						<p>Make some HTTP requests with your application to see them here</p>
					{:else}
						<p>Enable capture mode above to start monitoring</p>
					{/if}
				</div>
			{:else}
				<div class="exchanges-list">
					{#each exchanges as exchange (exchange.id)}
						<div class="exchange-item">
							<div class="exchange-header">
								<span class="method">{exchange.method}</span>
								<span class="domain">{getDomainEmoji(exchange.url)}</span>
								<span class="url">{exchange.url}</span>
								<span class="status"
									>{getStatusEmoji(exchange.response_status)} {exchange.response_status}</span
								>
								<span class="time">{formatTime(exchange.timestamp)}</span>
							</div>
							<div class="exchange-details">
								<span class="latency">⏱️ {exchange.latency_ms}ms</span>
								{#if exchange.is_ai_request}
									<span class="ai-badge">🤖 AI Request</span>
								{/if}
								<span class="host">{exchange.host}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.sushify-dashboard {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	header h1 {
		font-size: 2.5rem;
		margin: 0;
		color: #2d3748;
	}

	header p {
		font-size: 1.1rem;
		color: #718096;
		margin: 0.5rem 0 0 0;
	}

	.capture-control {
		text-align: center;
		margin-bottom: 3rem;
	}

	.toggle-btn {
		background: #e2e8f0;
		border: 2px solid #cbd5e0;
		border-radius: 12px;
		padding: 1rem 2rem;
		font-size: 1.2rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 1rem;
	}

	.toggle-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.toggle-btn.active {
		background: #48bb78;
		border-color: #38a169;
		color: white;
	}

	.status {
		font-size: 1rem;
		color: #4a5568;
		margin: 0;
	}

	.error {
		font-size: 0.9rem;
		color: #e53e3e;
		margin: 0.5rem 0;
		padding: 0.5rem;
		background: #fed7d7;
		border-radius: 6px;
		border: 1px solid #feb2b2;
	}

	.exchanges-section {
		margin-top: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 2px solid #e2e8f0;
		padding-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
		color: #2d3748;
		font-size: 1.5rem;
	}

	.exchange-stats {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.count,
	.loading {
		color: #718096;
		font-size: 0.9rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: #f7fafc;
		border-radius: 12px;
		border: 2px dashed #cbd5e0;
	}

	.empty-state p {
		color: #a0aec0;
		margin: 0.5rem 0;
	}

	.exchanges-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.exchange-item {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
		transition: all 0.2s ease;
	}

	.exchange-item:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: #cbd5e0;
	}

	.exchange-header {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.method {
		background: #4299e1;
		color: white;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		min-width: 60px;
		text-align: center;
	}

	.domain {
		font-size: 1.2rem;
	}

	.url {
		flex: 1;
		color: #4a5568;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.85rem;
		word-break: break-all;
	}

	.status {
		font-weight: 600;
		color: #2d3748;
	}

	.time {
		color: #718096;
		font-size: 0.8rem;
	}

	.exchange-details {
		display: flex;
		gap: 1rem;
		align-items: center;
		font-size: 0.8rem;
		color: #718096;
	}

	.latency {
		color: #805ad5;
	}

	.ai-badge {
		background: #48bb78;
		color: white;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-weight: 600;
	}

	.host {
		font-family: 'Monaco', 'Menlo', monospace;
	}
</style>

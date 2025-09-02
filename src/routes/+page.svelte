<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { source } from 'sveltekit-sse';
	import type { Exchange, CaptureStatusResponse } from '$lib/types';
	import type { PageData } from './$types';
	import Toggle from 'svelte-switcher';
	import ExchangesTable from '$lib/components/ExchangesTable.svelte';

	// Get loaded data from page load function
	let { data }: { data: PageData } = $props();

	let capturing = $state(false);
	let sessionId = $state<string | null>(null);
	let error = $state<string | null>(null);
	let exchanges = $state<Exchange[]>(data.initialExchanges);
	let analysisEnabled = $state(data.analysisEnabled);

	// SSE connection
	let sseConnection: ReturnType<typeof source> | null = null;

	// Check capture status and setup SSE on page load
	onMount(() => {
		checkCaptureStatus();
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
					const receivedExchange: Exchange = JSON.parse(data);

					// Check if this exchange already exists (could be an update with analysis)
					const existingIndex = exchanges.findIndex((ex) => ex.id === receivedExchange.id);

					if (existingIndex !== -1) {
						// Update existing exchange
						exchanges[existingIndex] = receivedExchange;
						exchanges = [...exchanges]; // Trigger reactivity
						console.log('📊 Updated exchange with analysis:', receivedExchange.id);
					} else {
						// Add new exchange to the beginning of the array
						exchanges = [receivedExchange, ...exchanges];
						console.log('📡 Added new exchange:', receivedExchange.id);
					}
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
</script>

<div class="sushify-dashboard">
	<header>
		<h1>🍣 Sushify Dashboard</h1>
		<p>Turn your prompt salad into sushi</p>
	</header>

	<main>
		<div class="exchanges-section">
			<div class="section-header">
				<div class="section-title">
					<h2>Captured Exchanges</h2>
					<label
						class="capture-toggle"
						title={capturing
							? 'Toggle to stop capturing network traffic'
							: 'Toggle to start capturing network traffic'}
					>
						<Toggle
							id="svelte-toggle"
							name="theme-toggle"
							onChange={toggleCapture}
							checked={capturing}
							defaultChecked={true}
						></Toggle>
					</label>
				</div>
				<div class="analysis-status-container">
					{#if capturing}
						<div class="analysis-status" transition:fade>
							{#if analysisEnabled}
								<span
									class="analysis-indicator enabled"
									title="Prompt analysis enabled - LLM calls will be analyzed for quality"
								>
									Analysis: ON
								</span>
							{:else}
								<span
									class="analysis-indicator disabled"
									title="Prompt analysis disabled - Set OPENAI_API_KEY environment variable to enable"
								>
									Analysis: OFF
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			{#if error}
				<p class="error">❌ {error}</p>
			{/if}
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
				<ExchangesTable {exchanges} {analysisEnabled} />
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

	.analysis-status {
		/* No margin needed since container handles positioning */
	}

	.analysis-indicator {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: help;
		white-space: nowrap;
		/* Ensure consistent vertical alignment */
		line-height: 1;
	}

	.analysis-indicator.enabled {
		background: #c6f6d5;
		color: #22543d;
		border: 1px solid #9ae6b4;
	}

	.analysis-indicator.disabled {
		background: #fed7d7;
		color: #742a2a;
		border: 1px solid #feb2b2;
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
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas: 'title status';
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 2px solid #e2e8f0;
		padding-bottom: 1rem;
		/* Ensure consistent baseline alignment */
		line-height: 1;
	}

	.section-title {
		grid-area: title;
		display: flex;
		align-items: center;
		gap: 1rem;
		/* Fine-tune vertical alignment */
		line-height: 1;
	}

	.section-title h2 {
		margin: 0;
		color: #2d3748;
		font-size: 1.5rem;
		/* Adjust line-height for better vertical alignment */
		line-height: 1.2;
		/* Slight adjustment to align with toggle */
		padding-bottom: 4px;
	}

	.capture-toggle {
		cursor: pointer;
		/* Ensure toggle aligns properly */
		display: flex;
		align-items: center;
	}

	.analysis-status-container {
		grid-area: status;
		/* Fixed width to prevent layout shift */
		width: 120px;
		display: flex;
		justify-content: flex-end;
		align-items: center;
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
</style>

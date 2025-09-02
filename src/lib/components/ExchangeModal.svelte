<script lang="ts">
	import type { Exchange } from '$lib/types';

	type Props = {
		exchange: Exchange | null;
		onClose: () => void;
	};

	let { exchange, onClose }: Props = $props();

	// Format time for display
	function formatTime(timestamp: string | undefined): string {
		if (!timestamp) return '-';
		return new Date(timestamp).toLocaleString();
	}

	// Format URL for display
	function formatUrl(url: string | undefined): string {
		if (!url) return '-';
		return url;
	}

	// Format status for display
	function formatStatus(statusCode: number | undefined): string {
		if (!statusCode) return 'Unknown';
		return `${statusCode}`;
	}

	// Format latency for display
	function formatLatency(latencyMs: number | undefined): string {
		if (!latencyMs) return '0ms';
		return `${latencyMs}ms`;
	}

	// Get domain emoji
	function getDomainEmoji(url: string | undefined): string {
		if (!url) return '🌐';
		try {
			const hostname = new URL(url).hostname;
			if (hostname.includes('openai.com')) return '🤖';
			if (hostname.includes('anthropic.com')) return '🧠';
			if (hostname.includes('google.com')) return '🔍';
			return '🌐';
		} catch {
			return '🌐';
		}
	}

	// Format JSON for display
	function formatJson(jsonString: string | null | undefined): string {
		if (!jsonString) return 'No data';
		try {
			const parsed = JSON.parse(jsonString);
			return JSON.stringify(parsed, null, 2);
		} catch {
			return jsonString;
		}
	}

	// Handle ESC key to close modal
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	// Handle backdrop click to close modal
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if exchange}
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="modal-container">
			<!-- Header with close button -->
			<div class="modal-header">
				<h2>Exchange Details</h2>
				<button class="close-button" onclick={onClose} title="Close (ESC)"> ✕ </button>
			</div>

			<!-- Exchange summary info -->
			<div class="exchange-summary">
				<div class="summary-item">
					<span class="label">Time:</span>
					<span class="value"
						>{formatTime(exchange.server_received_at || exchange.captured_at)}</span
					>
				</div>
				<div class="summary-item">
					<span class="label">URL:</span>
					<span class="value">{getDomainEmoji(exchange.url)} {formatUrl(exchange.url)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Status:</span>
					<span class="value">{formatStatus(exchange.response_status)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Latency:</span>
					<span class="value">{formatLatency(exchange.latency_ms)}</span>
				</div>
			</div>

			<!-- Content sections -->
			<div class="modal-content">
				{#if exchange.analysis_result}
					<div class="section">
						<h3>🧠 Analysis</h3>
						<div class="code-block">
							<pre>{formatJson(JSON.stringify(exchange.analysis_result))}</pre>
						</div>
					</div>
				{/if}

				<div class="section">
					<h3>📤 Request</h3>
					<div class="code-block">
						<pre>{formatJson(exchange.request_body)}</pre>
					</div>
				</div>

				<div class="section">
					<h3>📥 Response</h3>
					<div class="code-block">
						<pre>{formatJson(exchange.response_body)}</pre>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
		box-sizing: border-box;
	}

	.modal-container {
		background: white;
		border-radius: 12px;
		width: 95%;
		height: 90%;
		max-width: 1400px;
		max-height: 900px;
		display: flex;
		flex-direction: column;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 32px;
		border-bottom: 1px solid #e2e8f0;
		background: #f8fafc;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 24px;
		font-weight: 600;
		color: #1f2937;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: #6b7280;
		padding: 8px;
		border-radius: 6px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
	}

	.close-button:hover {
		background: #e5e7eb;
		color: #374151;
	}

	.exchange-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 16px;
		padding: 24px 32px;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.label {
		font-size: 12px;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.value {
		font-size: 14px;
		font-weight: 500;
		color: #1f2937;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.modal-content {
		flex: 1;
		padding: 32px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #1f2937;
	}

	.code-block {
		background: #000000;
		border-radius: 8px;
		padding: 20px;
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid #374151;
	}

	.code-block pre {
		margin: 0;
		color: #ffffff;
		font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	/* Custom scrollbar for code blocks */
	.code-block::-webkit-scrollbar {
		width: 8px;
	}

	.code-block::-webkit-scrollbar-track {
		background: #111111;
		border-radius: 4px;
	}

	.code-block::-webkit-scrollbar-thumb {
		background: #374151;
		border-radius: 4px;
	}

	.code-block::-webkit-scrollbar-thumb:hover {
		background: #4b5563;
	}

	/* Modal content scrollbar */
	.modal-content::-webkit-scrollbar {
		width: 8px;
	}

	.modal-content::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 4px;
	}

	.modal-content::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.modal-content::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}
</style>

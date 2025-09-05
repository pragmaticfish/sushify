<script lang="ts">
	import type { Exchange, AnalysisIssue } from '$lib/types';
	import Markdown from 'svelte-exmarkdown';

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
	function formatStatus(statusCode: number | null | undefined): string {
		if (statusCode === null) return 'ERROR';
		if (!statusCode) return 'Unknown';
		return `${statusCode}`;
	}

	// Format latency for display
	function formatLatency(latencyMs: number | undefined): string {
		if (!latencyMs) return '0ms';
		return `${latencyMs}ms`;
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

	// Sort issues by severity (high → medium → low) and then by category
	function sortIssues(issues: AnalysisIssue[]) {
		const severityOrder = { high: 0, medium: 1, low: 2 };

		return [...issues].sort((a, b) => {
			// Primary sort by severity
			const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
			if (severityDiff !== 0) {
				return severityDiff;
			}

			// Secondary sort by category (alphabetical)
			return a.category.localeCompare(b.category);
		});
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
					<span class="value">{formatUrl(exchange.url)}</span>
				</div>
				<div class="summary-item">
					<span class="label">Status:</span>
					<span class="value" title={exchange.error_details || ''}
						>{formatStatus(exchange.response_status)}</span
					>
				</div>
				<div class="summary-item">
					<span class="label">Latency:</span>
					<span class="value">{formatLatency(exchange.latency_ms)}</span>
				</div>
			</div>

			<!-- Content sections -->
			<div class="modal-content">
				{#if exchange.error_details}
					<div class="section">
						<h3>⚠️ Error Details</h3>
						<div class="code-block">
							<pre>{exchange.error_details}</pre>
						</div>
					</div>
				{/if}

				{#if exchange.analysis_result}
					<div class="section">
						<h3>🧠 Analysis</h3>
						{#if exchange.analysis_result.result === 'no issues found'}
							<div class="analysis-success">
								<div class="success-icon">✅</div>
								<div class="success-message">
									<h4>No Issues Found</h4>
									<p>This prompt appears to be well-structured with no identified issues.</p>
								</div>
							</div>
						{:else}
							<div class="analysis-issues">
								{#each sortIssues(exchange.analysis_result.result.issues) as issue (issue.id)}
									<div class="issue-card severity-{issue.severity}">
										<div class="issue-header">
											<div class="issue-title">
												<span class="category-badge category-{issue.category}">
													{issue.category.replace('_', ' ').toUpperCase()}
												</span>
												<h4>{issue.title}</h4>
											</div>
											<div class="issue-severity">
												{#if issue.severity === 'high'}
													🔴
												{:else if issue.severity === 'medium'}
													🟠
												{:else}
													🟡
												{/if}
											</div>
										</div>
										<div class="issue-body">
											<div class="issue-field">
												<strong>Description:</strong>
												<div class="markdown-content">
													<Markdown md={issue.description} />
												</div>
											</div>
											<div class="issue-field">
												<strong>Effect:</strong>
												<div class="markdown-content">
													<Markdown md={issue.effect} />
												</div>
											</div>
											{#if issue.how_to_fix && issue.how_to_fix !== null}
												<div class="issue-field">
													<strong>How to Fix:</strong>
													<div class="markdown-content">
														<Markdown md={issue.how_to_fix} />
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
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
		grid-template-columns: auto 2fr auto auto;
		gap: 2.5em;
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
		word-break: break-all;
		overflow-wrap: break-word;
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

	/* Analysis Success Styling */
	.analysis-success {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		margin-bottom: 16px;
	}

	.success-icon {
		font-size: 24px;
		flex-shrink: 0;
	}

	.success-message h4 {
		margin: 0 0 8px 0;
		color: #166534;
		font-size: 16px;
		font-weight: 600;
	}

	.success-message p {
		margin: 0;
		color: #15803d;
		line-height: 1.5;
	}

	/* Analysis Issues Styling */
	.analysis-issues {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.issue-card {
		border-radius: 8px;
		border: 1px solid;
		overflow: hidden;
		background: white;
	}

	.issue-card.severity-high {
		border-color: #fca5a5;
		box-shadow: 0 1px 3px rgba(239, 68, 68, 0.1);
	}

	.issue-card.severity-medium {
		border-color: #fde047;
		box-shadow: 0 1px 3px rgba(234, 179, 8, 0.1);
	}

	.issue-card.severity-low {
		border-color: #93c5fd;
		box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
	}

	.issue-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	.issue-title {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.issue-title h4 {
		margin: 0;
		color: #1f2937;
		font-size: 16px;
		font-weight: 600;
		flex: 1;
		min-width: 200px;
	}

	.issue-severity {
		font-size: 20px;
		line-height: 1;
	}

	.severity-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 4px 8px;
		border-radius: 4px;
		color: white;
		letter-spacing: 0.05em;
	}

	.severity-badge.severity-high {
		background: #ef4444;
	}

	.severity-badge.severity-medium {
		background: #f97316; /* Orange */
	}

	.severity-badge.severity-low {
		background: #eab308; /* Yellow */
	}

	.category-badge {
		font-size: 10px;
		font-weight: 500;
		padding: 4px 8px;
		border-radius: 4px;
		background: #6b7280;
		color: white;
		letter-spacing: 0.05em;
	}

	.category-badge.category-contradictory {
		background: #3d2245; /* Dark Purple */
	}

	.category-badge.category-vague {
		background: #222645; /* Dark Blue */
	}

	.category-badge.category-misleading {
		background: #222645; /* Dark Blue */
	}

	.category-badge.category-missing {
		background: #222645; /* Dark Blue */
	}

	.category-badge.category-over_complexity {
		background: #222645; /* Dark Blue */
	}

	.category-badge.category-bad_prompt_structure {
		background: #452238; /* Dark Maroon */
	}

	.category-badge.category-bad_context_management {
		background: #000000; /* Black */
	}

	.category-badge.category-other {
		background: #403e3f; /* Very Dark Grey */
	}

	.issue-body {
		padding: 16px;
	}

	.issue-field {
		margin-bottom: 16px;
	}

	.issue-field:last-child {
		margin-bottom: 0;
	}

	.issue-field strong {
		display: block;
		color: #374151;
		font-weight: 600;
		margin-bottom: 6px;
		font-size: 14px;
	}

	/* Markdown content styling */
	.markdown-content {
		color: #4b5563;
		line-height: 1.6;
		font-size: 14px;
	}

	.markdown-content :global(p) {
		margin: 0 0 12px 0;
	}

	.markdown-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.markdown-content :global(ul) {
		margin: 8px 0;
		padding-left: 20px;
	}

	.markdown-content :global(li) {
		margin: 4px 0;
	}

	.markdown-content :global(blockquote) {
		margin: 12px 0;
		padding: 12px 16px;
		background: #f8fafc;
		border-left: 4px solid #e2e8f0;
		border-radius: 0 4px 4px 0;
		font-style: italic;
		color: #6b7280;
	}

	.markdown-content :global(blockquote p) {
		margin: 0;
	}

	.markdown-content :global(code) {
		background: #f1f5f9;
		padding: 2px 4px;
		border-radius: 3px;
		font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
		font-size: 13px;
		color: #374151;
	}

	.markdown-content :global(strong) {
		font-weight: 600;
		color: #374151;
	}

	.markdown-content :global(em) {
		font-style: italic;
		color: #6b7280;
	}
</style>

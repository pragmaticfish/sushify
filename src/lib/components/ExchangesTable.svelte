<script lang="ts">
	import type { Exchange } from '$lib/types';
	import SushinessIndicator from './SushinessIndicator.svelte';
	import ExchangeModal from './ExchangeModal.svelte';

	type Props = {
		exchanges: Exchange[];
		analysisEnabled: boolean;
	};

	let { exchanges, analysisEnabled }: Props = $props();

	type SortField = 'server_received_at' | 'url' | 'response_status' | 'latency_ms' | 'sushiness';
	type SortDirection = 'asc' | 'desc';

	let sortField: SortField = $state('server_received_at');
	let sortDirection: SortDirection = $state('desc');

	// Modal state
	let selectedExchange: Exchange | null = $state(null);

	// Helper function to get sushiness level for sorting
	function getSushinessLevel(
		exchange: Exchange
	): 'red' | 'orange' | 'yellow' | 'green' | 'computing' | 'disabled' {
		if (!analysisEnabled) {
			return 'disabled';
		}

		if (!exchange.analysis_result) {
			return 'computing';
		}

		const analysis = exchange.analysis_result;
		if (analysis.result === 'no issues found') {
			return 'green';
		}

		const issues = analysis.result.issues;
		const hasHigh = issues.some((i) => i.severity === 'high');
		const hasMedium = issues.some((i) => i.severity === 'medium');
		const hasLow = issues.some((i) => i.severity === 'low');

		// Show highest severity found
		if (hasHigh) {
			return 'red';
		}
		if (hasMedium) {
			return 'orange';
		}
		if (hasLow) {
			return 'yellow';
		}

		// Fallback (shouldn't happen if issues array isn't empty)
		return 'yellow';
	}

	// Helper function to get sort value for sushiness
	function getSushinessSortValue(
		level: 'red' | 'orange' | 'yellow' | 'green' | 'computing' | 'disabled'
	): number {
		switch (level) {
			case 'red':
				return 0; // Highest priority
			case 'orange':
				return 1;
			case 'yellow':
				return 2;
			case 'computing':
				return 3; // Computing states in middle
			case 'green':
				return 4;
			case 'disabled':
				return 5; // Lowest priority
		}
	}

	// Computed sorted exchanges
	let sortedExchanges = $derived(() => {
		const sorted = [...exchanges].sort((a, b) => {
			let aVal: string | number;
			let bVal: string | number;

			switch (sortField) {
				case 'server_received_at':
					aVal = new Date(a.server_received_at || 0).getTime();
					bVal = new Date(b.server_received_at || 0).getTime();
					break;
				case 'url':
					aVal = a.url || '';
					bVal = b.url || '';
					break;
				case 'response_status':
					aVal = a.response_status || 0;
					bVal = b.response_status || 0;
					break;
				case 'latency_ms':
					aVal = a.latency_ms || 0;
					bVal = b.latency_ms || 0;
					break;
				case 'sushiness':
					aVal = getSushinessSortValue(getSushinessLevel(a));
					bVal = getSushinessSortValue(getSushinessLevel(b));
					break;
			}

			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		return sorted;
	});

	// Handle sorting
	function handleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = field === 'server_received_at' ? 'desc' : 'asc'; // Time defaults to desc (newest first)
		}
	}

	// Handle sushiness indicator click for details
	function handleSushinessClick(e: Event, exchange: Exchange) {
		e.stopPropagation(); // Prevent row click

		const level = getSushinessLevel(exchange);

		// Don't allow clicking when pulsing (computing)
		if (level === 'computing') {
			return;
		}

		// Open modal with exchange details
		selectedExchange = exchange;
	}

	// Close modal
	function closeModal() {
		selectedExchange = null;
	}

	// Format time for display
	function formatTime(timestamp: string | undefined): string {
		if (!timestamp) return '-';
		return new Date(timestamp).toLocaleTimeString();
	}

	// Format status for display
	function formatStatus(statusCode: number | null | undefined): string {
		if (statusCode === null) return '⚠️ ERROR';
		if (!statusCode) return '❓ Unknown';
		if (statusCode >= 200 && statusCode < 300) return `✅ ${statusCode}`;
		if (statusCode >= 400 && statusCode < 500) return `❌ ${statusCode}`;
		if (statusCode >= 500) return `💥 ${statusCode}`;
		return `ℹ️ ${statusCode}`;
	}

	// Format latency for display
	function formatLatency(latencyMs: number | undefined): string {
		if (!latencyMs) return '⏱️ 0ms';
		return `⏱️ ${latencyMs}ms`;
	}

	// Get sort indicator
	function getSortIndicator(field: SortField): string {
		if (sortField !== field) return '';
		return sortDirection === 'asc' ? '▲' : '▼';
	}
</script>

<div class="table-container">
	<table class="exchanges-table">
		<thead>
			<tr>
				<th class="sortable" onclick={() => handleSort('server_received_at')}>
					Time {getSortIndicator('server_received_at')}
				</th>
				<th class="sortable" onclick={() => handleSort('url')}>
					URL {getSortIndicator('url')}
				</th>
				<th class="sortable" onclick={() => handleSort('response_status')}>
					Status {getSortIndicator('response_status')}
				</th>
				<th class="sortable" onclick={() => handleSort('latency_ms')}>
					Latency {getSortIndicator('latency_ms')}
				</th>
				<th class="sortable" onclick={() => handleSort('sushiness')}>
					Sushiness {getSortIndicator('sushiness')}
				</th>
			</tr>
		</thead>
		<tbody>
			{#each sortedExchanges() as exchange (exchange.id)}
				<tr class="exchange-row">
					<td class="time-cell">
						{formatTime(exchange.server_received_at)}
					</td>
					<td class="url-cell">
						🤖 {exchange.url}
					</td>
					<td class="status-cell" title={exchange.error_details || ''}>
						{formatStatus(exchange.response_status)}
					</td>
					<td class="latency-cell">
						{formatLatency(exchange.latency_ms)}
					</td>
					<td class="sushiness-cell">
						<SushinessIndicator
							level={getSushinessLevel(exchange)}
							onclick={(e) => handleSushinessClick(e, exchange)}
						/>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" class="empty-state">
						No exchanges captured yet. Start making AI requests to see them here!
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Exchange Details Modal -->
<ExchangeModal exchange={selectedExchange} onClose={closeModal} />

<style>
	.table-container {
		width: 100%;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.exchanges-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}

	thead {
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	th {
		padding: 12px 16px;
		text-align: left;
		font-weight: 600;
		color: #374151;
		border-right: 1px solid #e2e8f0;
	}

	th:last-child {
		border-right: none;
	}

	th.sortable {
		cursor: pointer;
		user-select: none;
		transition: background-color 0.2s;
	}

	th.sortable:hover {
		background: #e2e8f0;
	}

	tbody tr {
		border-bottom: 1px solid #f1f5f9;
		transition: background-color 0.2s;
		min-height: 48px;
	}

	tbody tr:hover {
		background: #f8fafc;
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	td {
		padding: 12px 16px;
		border-right: 1px solid #f1f5f9;
		vertical-align: middle;
	}

	td:last-child {
		border-right: none;
	}

	.time-cell {
		font-family: 'Monaco', 'Menlo', monospace;
		color: #6b7280;
		white-space: nowrap;
		width: 100px;
		min-width: 100px;
	}

	.url-cell {
		max-width: 400px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: auto;
	}

	.status-cell {
		white-space: nowrap;
		width: 100px;
		min-width: 100px;
	}

	.latency-cell {
		font-family: 'Monaco', 'Menlo', monospace;
		white-space: nowrap;
		width: 100px;
		min-width: 100px;
	}

	.sushiness-cell {
		width: 100px;
		min-width: 100px;
		max-width: 100px;
		min-height: 48px;
		padding: 0;
		position: relative;
	}

	.empty-state {
		text-align: center;
		color: #6b7280;
		font-style: italic;
		padding: 48px 16px;
	}
</style>

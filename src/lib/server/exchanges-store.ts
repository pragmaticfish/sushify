import type { Exchange, AnalysisResult } from '$lib/types';

// Simple in-memory store for captured exchanges
// Later we'll use SQLite database as planned
let exchanges: Exchange[] = [];

export function addExchange(exchange: Exchange): void {
	exchanges.push(exchange);
}

export function getExchanges(limit = 50): Exchange[] {
	// Return recent exchanges (reverse chronological order)
	return exchanges.slice(-limit).reverse();
}

export function getTotalExchanges(): number {
	return exchanges.length;
}

export function clearExchanges(): number {
	const count = exchanges.length;
	exchanges = [];
	return count;
}

// Update an exchange with analysis results
export function updateExchangeAnalysis(
	exchangeId: string,
	analysisResult: AnalysisResult
): boolean {
	const exchangeIndex = exchanges.findIndex((ex) => ex.id === exchangeId);
	if (exchangeIndex !== -1) {
		exchanges[exchangeIndex] = {
			...exchanges[exchangeIndex],
			analysis_result: analysisResult
		};
		return true;
	}
	return false;
}

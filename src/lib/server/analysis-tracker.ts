/**
 * Simple tracker for pending LLM analyses
 * Prevents shutdown while analyses are in progress
 */

// Set to track active analysis IDs
const pendingAnalyses = new Set<string>();

/**
 * Register an analysis as started
 */
export function trackAnalysisStarted(exchangeId: string): void {
	pendingAnalyses.add(exchangeId);
}

/**
 * Register an analysis as completed (success or failure)
 */
export function trackAnalysisFinished(exchangeId: string): void {
	pendingAnalyses.delete(exchangeId);
}

/**
 * Get list of pending analysis IDs
 */
export function getPendingIds(): string[] {
	return Array.from(pendingAnalyses);
}

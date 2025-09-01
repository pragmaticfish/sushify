/**
 * Analysis configuration and status checking
 */

// Check if LLM analysis is enabled
export function checkAnalysisStatus(): boolean {
	// Analysis is enabled if OpenAI API key is available
	return !!process.env.OPENAI_API_KEY;
}

// // Get analysis configuration
// export function getAnalysisConfig() {
//     return {
//         enabled: checkAnalysisStatus(),
//         model: "gpt-4o-mini", // Cheaper model for analysis
//         maxConcurrentAnalyses: 3 // Limit concurrent analyses
//     };
// }

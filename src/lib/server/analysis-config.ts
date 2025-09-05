/**
 * Analysis configuration and status checking
 */

// Check if LLM analysis is enabled
export function checkAnalysisStatus(): boolean {
	// Analysis is enabled if OpenAI API key is available
	return !!process.env.OPENAI_API_KEY;
}

export function getAnalysisMode(): 'cheap' | 'deep' {
	return process.env.ANALYSIS_MODE === 'cheap' ? 'cheap' : 'deep';
}

// This is used by the frontend to display the analysis status
export function getAnalysisStatus(): 'off' | 'cheap' | 'deep' {
	if (!checkAnalysisStatus()) {
		return 'off';
	}
	return getAnalysisMode();
}

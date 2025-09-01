import type { PageServerLoad } from './$types';
import { getExchanges } from '$lib/server/exchanges-store';
import { checkAnalysisStatus } from '$lib/server/analysis-config';

export const load: PageServerLoad = async () => {
	// Check if analysis is enabled
	const analysisEnabled = checkAnalysisStatus();

	// Load initial exchanges from shared store
	const initialExchanges = getExchanges(50);

	return {
		analysisEnabled,
		initialExchanges
	};
};

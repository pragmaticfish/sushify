import type { PageServerLoad } from './$types';
import { getExchanges } from '$lib/server/exchanges-store';
import { getAnalysisStatus } from '$lib/server/analysis-config';
import { getCaptureState } from '$lib/server/capture-state';

export const load: PageServerLoad = async () => {
	// Get analysis status (off, cheap, or deep)
	const analysisStatus = getAnalysisStatus();

	// Load initial exchanges from shared store
	const initialExchanges = getExchanges(50);

	return {
		analysisStatus,
		initialExchanges,
		capturing: getCaptureState()
	};
};

import type { PageServerLoad } from './$types';
import { getExchanges } from '$lib/server/exchanges-store';

export const load: PageServerLoad = async () => {
	// Check if analysis is enabled by presence of OpenAI API key
	const analysisEnabled = !!process.env.OPENAI_API_KEY;

	// Load initial exchanges from shared store
	const initialExchanges = getExchanges(50);

	return {
		analysisEnabled,
		initialExchanges
	};
};

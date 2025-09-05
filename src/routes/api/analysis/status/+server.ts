import { json } from '@sveltejs/kit';
import { getPendingIds } from '$lib/server/analysis-tracker';

export async function GET() {
	return json(getPendingIds());
}

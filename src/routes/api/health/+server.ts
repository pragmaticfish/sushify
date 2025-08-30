import { json } from '@sveltejs/kit';

export async function GET() {
	return json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		service: 'sushify-dashboard'
	});
}

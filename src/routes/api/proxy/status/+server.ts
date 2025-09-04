import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { getCaptureState, setCaptureState } from '$lib/server/capture-state';

// This endpoint is used by:
// 1. CLI readiness check to verify dashboard is ready
// 2. Python interceptor to check if capture is enabled
// 3. UI toggle to change capture state

export async function GET() {
	return json({
		capturing: getCaptureState(),
		ready: true
	});
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { action } = body;

		if (action === 'enable') {
			setCaptureState(true);
			return json({
				success: true,
				capturing: true,
				message: 'Capture mode enabled'
			});
		}

		if (action === 'disable') {
			setCaptureState(false);
			return json({
				success: true,
				capturing: false,
				message: 'Capture mode disabled'
			});
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('❌ Error in proxy status endpoint:', error);
		return json({ error: 'Invalid request' }, { status: 400 });
	}
}

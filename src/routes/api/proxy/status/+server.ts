import { json } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import type { RequestEvent } from './$types';
import type {
	CaptureStatusResponse,
	CaptureToggleRequest,
	CaptureToggleResponse,
	ApiErrorResponse
} from '$lib/types';

// Simple in-memory store for capture state
// Later we'll use a proper database or shared state management
// Start with capture enabled by default for better UX
const initialSessionId = `session-${nanoid(10)}`;
let captureState: CaptureStatusResponse = {
	capturing: true,
	sessionId: initialSessionId,
	startedAt: new Date()
};

// Log initial state
console.log(`🟢 Proxy capture enabled by default - Session: ${initialSessionId}`);

export async function GET() {
	return json({
		capturing: captureState.capturing,
		sessionId: captureState.sessionId,
		startedAt: captureState.startedAt
	});
}

export async function POST({ request }: RequestEvent) {
	try {
		const body: CaptureToggleRequest = await request.json();

		if (body.action === 'enable') {
			const sessionId = `session-${nanoid(10)}`;
			captureState = {
				capturing: true,
				sessionId,
				startedAt: new Date()
			};

			console.log(`🟢 Proxy capture enabled - Session: ${sessionId}`);

			const response: CaptureToggleResponse = {
				success: true,
				capturing: true,
				sessionId,
				message: 'Capture mode enabled'
			};
			return json(response);
		}

		if (body.action === 'disable') {
			const previousSession = captureState.sessionId;
			captureState = {
				capturing: false,
				sessionId: null,
				startedAt: null
			};

			console.log(`🔴 Proxy capture disabled - Previous session: ${previousSession}`);

			const response: CaptureToggleResponse = {
				success: true,
				capturing: false,
				sessionId: null,
				message: 'Capture mode disabled'
			};
			return json(response);
		}

		const errorResponse: ApiErrorResponse = { error: 'Invalid action' };
		return json(errorResponse, { status: 400 });
	} catch (error) {
		console.error('❌ Error in proxy status endpoint:', error);
		const errorResponse: ApiErrorResponse = { error: 'Invalid request' };
		return json(errorResponse, { status: 400 });
	}
}

import { produce } from 'sveltekit-sse';
import { nanoid } from 'nanoid';
import { addConnection, removeConnection } from '$lib/sse-manager';

export function POST() {
	return produce(
		function start({ emit }) {
			// Generate a unique connection ID
			const connectionId = `conn_${nanoid(8)}`;

			// Store the emitter function
			addConnection(connectionId, emit);

			// Send initial connection confirmation
			emit(
				'connected',
				JSON.stringify({
					connectionId,
					timestamp: new Date().toISOString()
				})
			);

			// Return cleanup function
			return function stop() {
				removeConnection(connectionId);
			};
		},
		{
			// Custom ping interval (default is 30 seconds)
			ping: 30000,
			stop() {
				console.log('📡 SSE connection stopped');
			}
		}
	);
}

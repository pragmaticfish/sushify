import type { Exchange } from './types';

// Type for the emit function from sveltekit-sse
type EmitFunction = (event: string, data: string) => { error?: false | Error };

// In-memory store for SSE connections
const connections = new Map<string, EmitFunction>();

export function addConnection(connectionId: string, emit: EmitFunction) {
	connections.set(connectionId, emit);
	console.log(`📡 SSE client connected: ${connectionId} (Total: ${connections.size})`);
}

export function removeConnection(connectionId: string) {
	connections.delete(connectionId);
	console.log(`📡 SSE client disconnected: ${connectionId} (Remaining: ${connections.size})`);
}

export function broadcastExchange(exchange: Exchange) {
	const data = JSON.stringify(exchange);
	let successCount = 0;

	connections.forEach((emit, connectionId) => {
		const { error } = emit('exchange', data);
		if (error instanceof Error) {
			console.error(`Failed to send SSE to ${connectionId}:`, error);
		} else {
			successCount++;
		}
	});

	if (connections.size > 0) {
		console.log(`📡 Broadcasted exchange to ${successCount}/${connections.size} clients`);
	}
}

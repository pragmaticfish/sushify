import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import type { Exchange } from '$lib/types';
import { broadcastExchange } from '$lib/sse-manager';
import {
	getExchanges,
	addExchange,
	getTotalExchanges,
	clearExchanges
} from '$lib/server/exchanges-store';

export async function GET() {
	// Return recent exchanges (limit to last 50 for now)
	const recentExchanges = getExchanges(50);

	return json({
		exchanges: recentExchanges,
		total: getTotalExchanges()
	});
}

export async function POST({ request }: RequestEvent) {
	try {
		const rawExchange = await request.json();

		// Validate exchange structure
		if (!rawExchange.id || !rawExchange.url || !rawExchange.method) {
			return json({ error: 'Invalid exchange format' }, { status: 400 });
		}

		// Type the validated exchange
		const exchange: Exchange = {
			...rawExchange,
			server_received_at: new Date().toISOString()
		};

		// Store the exchange
		addExchange(exchange);

		console.log(
			`📡 Received exchange: ${exchange.method} ${exchange.url} -> ${exchange.response_status}`
		);

		// Broadcast to all connected SSE clients
		broadcastExchange(exchange);

		// TODO: Later we'll trigger LLM analysis here

		return json({
			success: true,
			id: exchange.id,
			message: 'Exchange captured'
		});
	} catch (error) {
		console.error('❌ Error saving exchange:', error);
		return json({ error: 'Failed to save exchange' }, { status: 500 });
	}
}

// Endpoint to clear all exchanges (for testing)
export async function DELETE() {
	const count = clearExchanges();

	console.log(`🗑️ Cleared ${count} exchanges`);

	return json({
		success: true,
		message: `Cleared ${count} exchanges`
	});
}

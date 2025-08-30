import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import type { Exchange } from '$lib/types';

// Simple in-memory store for captured exchanges
// Later we'll use SQLite database as planned
let exchanges: Exchange[] = [];

export async function GET() {
	// Return recent exchanges (limit to last 50 for now)
	const recentExchanges = exchanges.slice(-50).reverse();

	return json({
		exchanges: recentExchanges,
		total: exchanges.length
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
		exchanges.push(exchange);

		console.log(
			`📡 Received exchange: ${exchange.method} ${exchange.url} -> ${exchange.response_status}`
		);

		// TODO: Later we'll broadcast this via SSE for real-time UI updates
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
	const count = exchanges.length;
	exchanges = [];

	console.log(`🗑️ Cleared ${count} exchanges`);

	return json({
		success: true,
		message: `Cleared ${count} exchanges`
	});
}

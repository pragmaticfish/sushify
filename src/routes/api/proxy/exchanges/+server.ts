import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import type { Exchange } from '$lib/types';
import { broadcastExchange } from '$lib/sse-manager';
import {
	getExchanges,
	addExchange,
	getTotalExchanges,
	clearExchanges,
	updateExchangeAnalysis
} from '$lib/server/exchanges-store';
import { analyzeLLMExchange, type CapturedExchange } from '$lib/server/analysis';
import { checkAnalysisStatus } from '$lib/server/analysis-config';
import { appendFileSync } from 'fs';

// Analysis debug log file
const ANALYSIS_LOG_FILE = '/tmp/sushify-analysis.log';

function logToAnalysisFile(message: string) {
	const timestamp = new Date().toISOString();
	const logLine = `[${timestamp}] ${message}\n`;
	try {
		appendFileSync(ANALYSIS_LOG_FILE, logLine);
	} catch (error) {
		console.error('Failed to write to analysis log:', error);
	}
}

// Background analysis function
async function triggerBackgroundAnalysis(exchange: Exchange) {
	try {
		const startMessage = `🔍 Starting background analysis for exchange ${exchange.id}`;
		console.log(startMessage);
		logToAnalysisFile(startMessage);

		// Convert Exchange type to CapturedExchange type for analysis
		const capturedExchange: CapturedExchange = {
			id: exchange.id,
			timestamp: exchange.timestamp,
			url: exchange.url,
			method: exchange.method,
			host: exchange.host,
			request_body: exchange.request_body || '',
			response_body: exchange.response_body || '',
			request_headers: exchange.request_headers || {},
			response_headers: exchange.response_headers || {},
			is_ai_request: exchange.is_ai_request || false,
			latency_ms: exchange.latency_ms || 0,
			response_status: exchange.response_status
		};

		logToAnalysisFile(
			`📋 Exchange data: ${JSON.stringify({
				id: capturedExchange.id,
				url: capturedExchange.url,
				method: capturedExchange.method,
				hasRequestBody: !!capturedExchange.request_body,
				hasResponseBody: !!capturedExchange.response_body,
				isAiRequest: capturedExchange.is_ai_request
			})}`
		);

		const analysis = await analyzeLLMExchange(capturedExchange);

		if (analysis) {
			// Store analysis result with the exchange
			const updateSuccess = updateExchangeAnalysis(exchange.id, analysis);
			const updateMessage = `💾 Analysis stored for exchange ${exchange.id}: ${updateSuccess}`;
			console.log(updateMessage);
			logToAnalysisFile(updateMessage);

			// Broadcast updated exchange with analysis via SSE
			if (updateSuccess) {
				const updatedExchange: Exchange = {
					...exchange,
					analysis_result: analysis
				};
				broadcastExchange(updatedExchange);
				logToAnalysisFile(`📡 Broadcasted updated exchange with analysis: ${exchange.id}`);
			}
		} else {
			const noAnalysisMessage = `⚠️ No analysis generated for exchange ${exchange.id}`;
			console.log(noAnalysisMessage);
			logToAnalysisFile(noAnalysisMessage);
		}
	} catch (error) {
		const errorMessage = `❌ Background analysis failed for exchange ${exchange.id}: ${error}`;
		console.error(errorMessage);
		logToAnalysisFile(errorMessage);
	}
}

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

		const logMessage = `📡 Received exchange: ${exchange.method} ${exchange.url} -> ${exchange.response_status} | AI: ${exchange.is_ai_request}`;
		console.log(logMessage);
		logToAnalysisFile(logMessage);

		// Broadcast to all connected SSE clients
		broadcastExchange(exchange);

		// Trigger LLM analysis if enabled and this is an AI request
		const analysisEnabled = checkAnalysisStatus();
		const statusMessage = `🔬 Analysis status - Enabled: ${analysisEnabled}, AI Request: ${exchange.is_ai_request}`;
		console.log(statusMessage);
		logToAnalysisFile(statusMessage);

		if (analysisEnabled && exchange.is_ai_request) {
			const triggerMessage = `🚀 TRIGGERING analysis for exchange ${exchange.id}`;
			console.log(triggerMessage);
			logToAnalysisFile(triggerMessage);
			// Run analysis in background without blocking the response
			triggerBackgroundAnalysis(exchange);
		} else {
			const skipMessage = `⏭️ Skipping analysis - Enabled: ${analysisEnabled}, AI: ${exchange.is_ai_request}`;
			console.log(skipMessage);
			logToAnalysisFile(skipMessage);
		}

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

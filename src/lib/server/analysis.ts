/**
 * LLM Analysis functionality for prompt engineering evaluation
 */

import type { AnalysisResult } from '$lib/types';
import { analysisOutputSchema, NO_ISSUES_FOUND } from '$lib/types';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getLogger } from '../utils/logging.js';
import { getAnalysisMode } from './analysis-config';
import { deepAnalyzeLLMExchange as analyzeLLMExchangeDeep } from './analyzers/deep-analyzer';
import { analyzeLLMExchangeCheap } from './analyzers/cheap-analyzer';

const analysisMode = getAnalysisMode();

// Type for captured exchange data
export interface CapturedExchange {
	id: string;
	timestamp: number;
	url: string;
	method: string;
	host: string;
	request_body: string;
	response_body: string;
	request_headers: Record<string, string>;
	response_headers: Record<string, string>;
	latency_ms: number;
	response_status?: number;
}

// Extract LLM conversation from exchange - API agnostic approach
function extractLLMConversation(exchange: CapturedExchange): string | null {
	if (!exchange.request_body) {
		return null;
	}

	// Include the request body for analysis
	let conversation = '';

	conversation += '=== REQUEST BODY ===\n';
	conversation += exchange.request_body + '\n\n';

	// Only include response if the request was successful (2xx status)
	// For failed requests, just note that there was an error
	if (exchange.response_body) {
		const responseStatus = exchange.response_status;
		if (!!responseStatus && responseStatus >= 200 && responseStatus < 300) {
			conversation += '=== RESPONSE BODY ===\n';
			conversation += exchange.response_body + '\n\n';
		} else {
			conversation += '=== REQUEST OUTCOME ===\n';
			conversation += `Request failed (response content omitted). Analyze the request for prompt issues as usual.\n\n`;
		}
	}

	conversation += '=== API ENDPOINT ===\n';
	conversation += `${exchange.method} ${exchange.url}\n\n`;

	return conversation;
}

// Analyze an LLM exchange for prompt engineering issues
export async function analyzeLLMExchange(
	exchange: CapturedExchange
): Promise<AnalysisResult | null> {
	// Note: No need to check is_ai_request - we only capture AI requests anyway

	const logger = getLogger();
	logger.info(`[analysis] Extracting conversation from exchange ${exchange.id}`);

	const conversation = extractLLMConversation(exchange);
	if (!conversation) {
		logger.warn(
			`[analysis] Could not extract conversation from exchange ${exchange.id} (request body length: ${exchange.request_body?.length || 0})`
		);
		return null;
	}

	logger.info(
		`[analysis] Starting LLM analysis for exchange ${exchange.id} (conversation length: ${conversation.length})`
	);

	try {
		logger.debug(
			`[analysis] Calling LLM for analysis of exchange ${exchange.id}, analysisMode: ${analysisMode}`
		);
		const rawAnalysis =
			analysisMode === 'deep'
				? await analyzeLLMExchangeDeep(conversation)
				: await analyzeLLMExchangeCheap(conversation);

		// Transform raw LLM output to enhanced format with unique IDs
		const analysisWithIds = addIdsToRawAnalysisResult(rawAnalysis);

		const issuesCount =
			analysisWithIds.result === NO_ISSUES_FOUND ? 0 : analysisWithIds.result.issues.length;
		logger.info(
			`[analysis] Analysis completed for exchange ${exchange.id} (issues found: ${issuesCount})`
		);
		return analysisWithIds;
	} catch (error) {
		logger.error(
			`[analysis] Analysis failed for exchange ${exchange.id} (URL: ${exchange.url}, Status: ${exchange.response_status}): ${String(error)}`
		);
		return null;
	}
}

// Helper function to transform raw LLM analysis to enhanced format with IDs
function addIdsToRawAnalysisResult(
	rawResult: z.infer<typeof analysisOutputSchema>
): AnalysisResult {
	if (rawResult.result === NO_ISSUES_FOUND) {
		return { result: NO_ISSUES_FOUND };
	}

	return {
		result: {
			issues: rawResult.result.issues.map((issue) => ({
				...issue,
				id: nanoid()
			}))
		}
	};
}

/**
 * LLM Analysis functionality for prompt engineering evaluation
 */

import { callModel } from './llm';
import { appendFileSync } from 'fs';
import type { AnalysisResult } from '$lib/types';
import { analysisOutputSchema } from '$lib/types';

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

// Analysis prompt and schema
const ANALYSIS_SYSTEM_PROMPT = `
You are an expert in prompt and context engineering for LLMs with sharp attention to details.
Your will get an exchange of inputs and outputs from a LLM.
Your task is to look at the instructions passed to the LLM as a whole: 
- System prompt
- The user prompt prefix/suffix that wrap the user query (if any)
- Tool descriptions, parameters and output shapes
- Output schema descriptions

and look for issues like:
- Contradictory instructions, e.g. system prompt says opposite things in different sections (e.g. use emojis or not)
- Misleading instructions, e.g. system prompt says to use a tool but the tool is not provided or the prompt tell the LLM to expect input of a certain shape but provides input of a different shape
- Vague instructions, e.g. the agent is asked to perform a task but isn't given enough context or information in order to do so
`;

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
	is_ai_request: boolean;
	latency_ms: number;
}

// Extract LLM conversation from exchange - API agnostic approach
function extractLLMConversation(exchange: CapturedExchange): string | null {
	if (!exchange.request_body) {
		return null;
	}

	// Just include the raw request and response for analysis
	let conversation = '';

	conversation += '=== REQUEST BODY ===\n';
	conversation += exchange.request_body + '\n\n';

	if (exchange.response_body) {
		conversation += '=== RESPONSE BODY ===\n';
		conversation += exchange.response_body + '\n\n';
	}

	conversation += '=== API ENDPOINT ===\n';
	conversation += `${exchange.method} ${exchange.url}\n\n`;

	return conversation;
}

// Analyze an LLM exchange for prompt engineering issues
export async function analyzeLLMExchange(
	exchange: CapturedExchange
): Promise<AnalysisResult | null> {
	logToAnalysisFile(`🔍 analyzeLLMExchange called for exchange ${exchange.id}`);

	// Only analyze AI requests
	if (!exchange.is_ai_request) {
		logToAnalysisFile(`⚠️ Skipping analysis - not an AI request: ${exchange.id}`);
		return null;
	}

	logToAnalysisFile(`📊 Attempting to extract conversation from exchange ${exchange.id}`);
	const conversation = extractLLMConversation(exchange);
	if (!conversation) {
		const message = `⚠️ Could not extract conversation from exchange ${exchange.id}`;
		console.log(message);
		logToAnalysisFile(message);
		logToAnalysisFile(`📋 Request body length: ${exchange.request_body?.length || 0}`);
		logToAnalysisFile(
			`📋 Request body preview: ${exchange.request_body?.substring(0, 200) || 'empty'}`
		);
		return null;
	}

	const analyzeMessage = `🔍 Analyzing LLM exchange ${exchange.id}`;
	console.log(analyzeMessage);
	logToAnalysisFile(analyzeMessage);
	logToAnalysisFile(`📝 Conversation extracted (${conversation.length} chars):`);
	logToAnalysisFile(conversation); // Log the FULL conversation

	try {
		logToAnalysisFile(`🤖 Calling real LLM for analysis`);
		const analysis = await callModel({
			input: [
				{ role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
				{
					role: 'user',
					content: `Please analyze this LLM exchange for prompt engineering issues:\n\n${conversation}`
				}
			],
			outputSchema: analysisOutputSchema,
			model: 'gpt-4o-mini' // Use cheaper model for analysis
		});

		const successMessage = `✅ Analysis completed for exchange ${exchange.id}: ${JSON.stringify(analysis)}`;
		console.log(successMessage);
		logToAnalysisFile(successMessage);
		return analysis;
	} catch (error) {
		const errorMessage = `❌ Analysis failed for exchange ${exchange.id}: ${error}`;
		console.log(errorMessage);
		logToAnalysisFile(errorMessage);
		return null;
	}
}

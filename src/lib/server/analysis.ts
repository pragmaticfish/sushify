/**
 * LLM Analysis functionality for prompt engineering evaluation
 */

import { callModel } from './llm';
import { appendFileSync } from 'fs';
import type { AnalysisResult } from '$lib/types';
import { analysisOutputSchema, NO_ISSUES_FOUND } from '$lib/types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

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
# Role
You are an expert in prompt and context engineering for LLMs with sharp attention to details.

# Goal
Your goal is to help engineer better prompts for the LLM. To gain their trust avoid false positives. Be critical and fair and make sure to be as specific as possible.

# Task
You will get an exchange of inputs and outputs from a LLM.

Your task is to look at the instructions passed to the LLM as a whole:
- System prompt
- The user prompt prefix/suffix that wrap the user query (if any) - but not the user query itself (use your best judgment and err on the side of caution)
- Tool descriptions, parameters and output shapes
- Output schema descriptions

## Issue Categories to Look For

### Contradictory Instructions
- System prompt says opposite things in different sections (e.g. always do X vs never do X)
- Search for implied contradictions as well as explicit contradictions

### Misleading Instructions
- System prompt says to use a tool but the tool is not provided
- Prompt tells the LLM to expect input of a certain shape but provides input of a different shape

### Vague Instructions
- Agent is asked to perform a task but isn't given enough context or information
- Put yourself in the shoes of the LLM and try to imagine what it would do

### Missing Instructions
- System prompt is missing a crucial instruction (preferably evidence-based conclusion)
- Example: system prompt defines a role of a financial analyst but user requests a recipe and the LLM complies

### Over Complexity
- Relative to the model's capabilities
- System prompt asks the LLM to perform a task beyond the model's capabilities
- Provides a list of 100+ tools to use

### Bad Prompt Structure
- Missing clear role and task sections
- Uses bad formatting (no titles and bullet points)
- Poor organization and readability

### Other Issues
- Anything else not covered by the above categories

# Formatting Requirements

## Markdown Usage
- **Use markdown formatting** in all text fields (title, description, effect, how_to_fix)
- **Use bullet points** instead of long sentences
- **Be extremely concise** - maximum 1-2 short sentences per bullet point
- **Eliminate redundancy** - don't repeat information between bullet points
- **Make responses actionable** with specific examples

## Quoting Problematic Instructions
**Always use separate block quotes (>) for each source** when quoting problematic instructions:

### Examples:
In system prompt:
> "Never do X."

In user prompt:  
> "### Reminder: do X when appropriate."

In tool "search" description:
> "This tool cannot do Y."

In output schema, field "result":
> "Use search tool to do Y and populate this field."

**Important:** Each quote should be in its own blockquote, not combined together (this is critical, yes be concise but don't sacrifice clarity).

# Important Guidelines
- Focus on analyzing the **request** to the LLM, not the response
- Only use the response to search for evidence of issues in the request (or as a hint that there might be issues)

## Writing Style
- **Eliminate explanatory text** - assume the reader understands the concepts
- **No redundant phrases** like "The system prompt says" or "This creates a contradiction"  
- **Direct statements only** - state the issue, effect, and fix without elaboration

### EXCEPTION 1: Quote Format Must Be Preserved
When quoting problematic instructions, **ALWAYS use the exact format shown in examples above**:

    In system prompt:
    > "quoted text here"

    In user prompt:
    > "quoted text here"

	In tool "<toolname>" description:
	> "quoted text here"

	In output schema, field "<fieldname>":
	> "quoted text here"

The "In [source]:" labels are **REQUIRED** and are NOT considered redundant phrases.

- **Example of correct concise output:**
  - System forbids emojis
  - User prompt encourages emojis
  
  In system prompt:
  > "Never use emojis."
  
  In user prompt:
  > "### Reminder: use emojis when appropriate."

### EXCEPTION 2: If you observed an effect on the output you must mention it in the effect section to make the user aware of it.
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
	logToAnalysisFile(`🔍 analyzeLLMExchange called for exchange ${exchange.id}`);

	// Note: No need to check is_ai_request - we only capture AI requests anyway

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
		const rawAnalysis = await callModel({
			input: [
				{ role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
				{
					role: 'user',
					content: `Please analyze this LLM exchange for prompt engineering issues:\n\n${conversation}`
				}
			],
			outputSchema: analysisOutputSchema,
			model: 'gpt-4.1-2025-04-14'
		});

		// Transform raw LLM output to enhanced format with unique IDs
		const analysisWithIds = addIdsToRawAnalysisResult(rawAnalysis);

		const successMessage = `✅ Analysis completed for exchange ${exchange.id}: ${JSON.stringify(analysisWithIds)}`;
		console.log(successMessage);
		logToAnalysisFile(successMessage);
		return analysisWithIds;
	} catch (error) {
		const errorMessage = `❌ Analysis failed for exchange ${exchange.id}: ${error}`;
		console.log(errorMessage);
		logToAnalysisFile(errorMessage);
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

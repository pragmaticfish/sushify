import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type {
	Tool as ResponseTool,
	ResponseFunctionToolCallItem
} from 'openai/resources/responses/responses';
import { z, type ZodSchema } from 'zod';

export type Message = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

type LLMCallParams<Schema extends ZodSchema> = {
	input: Message[];
	outputSchema: Schema;
	model?: string;
	tools?: ResponseTool[];
};

const DEFAULT_MODEL = 'gpt-4.1-nano';

// Notice - it expects the API key to be set in the environment variable OPENAI_API_KEY
const client = new OpenAI();

// Retry function with exponential backoff for rate limits
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
	let lastError: any;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: any) {
			lastError = error;

			// Only retry on rate limit errors (429)
			if (error?.status !== 429 || attempt === maxRetries) {
				throw error;
			}

			// Calculate wait time from header or use exponential backoff
			let waitMs = 0;

			if (error?.headers?.get) {
				const retryAfter = error.headers.get('retry-after');
				if (retryAfter) {
					// retry-after can be in seconds or HTTP-date format
					const retryAfterNum = parseInt(retryAfter);
					if (!isNaN(retryAfterNum)) {
						waitMs = retryAfterNum * 1000; // convert to milliseconds
					}
				}
			}

			// Fallback to exponential backoff if no retry-after header
			if (waitMs === 0) {
				waitMs = Math.min(1000 * Math.pow(2, attempt), 60000); // Cap at 60 seconds
			}

			console.log(
				`🔄 Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${waitMs}ms before retry...`
			);
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}
	}

	throw lastError;
}

// Internal function that makes a single call to the model
async function callModelOnce<Schema extends ZodSchema>(
	params: LLMCallParams<Schema>,
	forceNoTools: boolean = false
): Promise<{ result: z.infer<Schema> | ResponseFunctionToolCallItem[] }> {
	const modelInput = {
		model: params.model || DEFAULT_MODEL,
		tools: forceNoTools ? [] : params.tools || [],
		tool_choice: forceNoTools ? 'none' : undefined,
		input: params.input,
		text: { format: zodTextFormat(params.outputSchema, 'output') }
	} as const;
	//addToQueue(modelInput);
	const response = await withRetry(() => client.responses.parse(modelInput));

	// Prefer parsed output when present, otherwise return all function calls
	if (response.output_parsed !== null) return { result: response.output_parsed };

	const functionCalls = response.output.filter(
		(item) => item.type === 'function_call'
	) as ResponseFunctionToolCallItem[];
	if (functionCalls.length > 0) {
		return { result: functionCalls };
	}

	// Fallback: no parsed content and no tool calls
	throw new Error('Model returned neither parsed text nor function calls');
}

// @sushi-llm-call-marker
export async function callModel<Schema extends ZodSchema>(
	params: LLMCallParams<Schema>,
	scopeId: string = 'DEFAULT_SCOPE'
): Promise<z.infer<Schema>> {
	const MAX_ITERATIONS = 100; // Prevent infinite loops
	let iterations = 0;
	while (iterations < MAX_ITERATIONS) {
		iterations++;
		console.log(`🔄 Iteration ${iterations}`);
		const { result }: { result: z.infer<Schema> | ResponseFunctionToolCallItem[] } =
			await callModelOnce(params, false);
		// If we got parsed content, we're done
		if (!Array.isArray(result)) {
			// Add the final response to history
			params.input.push({
				role: 'assistant',
				content: JSON.stringify(result)
			});
			return result;
		}

		// We got function calls - execute them and add results to history
		const functionCalls = result as ResponseFunctionToolCallItem[];

		for (const call of functionCalls) {
			// Find the tool that matches this function call
			const tool = params.tools?.find((t) => t.type === 'function' && t.name === call.name);
			if (!tool) {
				throw new Error(`Unknown function called: ${call.name}`);
			}

			try {
				// Parse the arguments
				const args = JSON.parse(call.arguments);
				console.log(`🔧 Executing tool: ${call.name} with args:`, args);

				// Execute the function (assuming zodResponsesFunction tools have a $callback)
				const toolResult = await (tool as any).$callback?.(args);
				console.log(
					`✅ Tool ${call.name} result:`,
					typeof toolResult === 'string' && toolResult.length > 200
						? toolResult.substring(0, 200) + '...'
						: toolResult
				);

				// Add function call and result to history
				params.input.push({
					role: 'assistant',
					content: `Called function ${call.name} with arguments: ${call.arguments}`
				});
				params.input.push({
					role: 'system',
					content: `Function ${call.name} returned: ${toolResult}`
				});
			} catch (error) {
				console.log(`❌ Tool ${call.name} failed:`, error);
				// Add error to history
				params.input.push({
					role: 'system',
					content: `Function ${call.name} failed: ${error instanceof Error ? error.message : String(error)}`
				});
			}
		}
	}

	// Maximum iterations reached - give the assistant one final chance to respond
	params.input.push({
		role: 'system',
		content: `Maximum tool call iterations (${MAX_ITERATIONS}) reached. Please provide a final response without making any more tool calls.`
	});

	// Make one final call with tools disabled
	const finalResult = await callModelOnce(params, true);

	// This should be parsed content since we forced no tools
	if (!Array.isArray(finalResult)) {
		// Add the final response to history
		params.input.push({
			role: 'assistant',
			content: JSON.stringify(finalResult)
		});
		return finalResult;
	}

	// This shouldn't happen since we disabled tools, but handle it gracefully
	throw new Error(
		'Model attempted to call tools even when disabled after reaching maximum iterations'
	);
}

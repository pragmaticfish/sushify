/**
 * LLM Analysis functionality using multiple LLM calls (one per category and a deduplication call)
 */

import { callModel } from '../llm';
import { analysisOutputSchema, issueSchema, NO_ISSUES_FOUND } from '$lib/types';
import { z } from 'zod';
// import { getLogger } from '../../utils/logging.js';

const analysisCategories = [
	{
		key: 'contradictory',
		name: 'Contradictory Instructions',
		description: `
		- System prompt says opposite things in different sections (e.g. always do X vs never do X)
		- Search for implied contradictions as well as explicit contradictions
		- Pay attention to examples and whether they are consistent with the instructions
		`
	},
	{
		key: 'misleading',
		name: 'Misleading Instructions',
		description: `
		- Example: System prompt says to use a tool but the tool is not provided
		- Example: Prompt tells the LLM to expect input of a certain shape but provides input of a different shape
		- **Note:** When structured outputs are used, do NOT flag missing JSON output requirements as misleading - the schema in text.format is sufficient`
	},
	{
		key: 'vague',
		name: 'Vague Instructions',
		description: `
		- Agent is asked to perform a task but isn't given enough context or information
		- Example: The LLM is to score something between 1-5 but isn't given instructions on how to pick a score consistently`
	},
	{
		key: 'missing',
		name: 'Missing Instructions',
		description: `
		- System prompt is missing a crucial instruction (preferably evidence-based conclusion)
		- Example: system prompt defines a role of a financial analyst but user requests a recipe and the LLM complies`
	},
	{
		key: 'bad_prompt_structure',
		name: 'Bad Prompt Structure',
		description: `
		- Example: Missing clear role and task sections
		- Example: Uses bad formatting (no titles and bullet points)
		- Example: Poor organization and readability`
	},
	{
		key: 'bad_context_management',
		name: 'Bad Context Management',
		description: `
		This is only relevant for longer exchanges. If it is a single message exchange, no need to check anything.
		- Conversation history contains duplicate messages that seem like a result of a bug in history management
		- Missing messages that break conversation flow/ coherence that seems like a result of context compaction errors that remove crucial conversation context
		- Conversation history that doesn't make logical sense when read sequentially`
	},
	{
		key: 'over_complexity',
		name: 'Over Complexity',
		description: `
		- Relative to the model's capabilities and instruction-following capacity
		- System prompt asks the LLM to perform a task beyond the model's capabilities
		- **Instruction density limits (based on IFScale research):**
		  - Reasoning models (o3, Gemini-2.5-Pro): ~100 simultaneous instructions with high accuracy
		  - Top non-reasoning models (GPT-4.1, Claude Sonnet): ~50 simultaneous instructions with high accuracy  
		  - Weaker models: Significantly fewer instructions before performance degrades
		- Example: Provides a list of 100+ tools to use
		- Example: Asking a weaker model to follow 50+ simultaneous constraints`
	}
];

const issueWithoutCategorySchema = z.object({
	title: z.string().describe('A concise title for the issue'),
	description: z
		.string()
		.describe(
			'A detailed yet concise description of the issue. Quote the specific problematic parts of the request and point to their origin (e.g system prompt, user prompt, tool descriptions, output schema)'
		),
	effect: z
		.string()
		.describe(
			'The effect of the issue on the response. What is the specific problematic behavior that is manifesting in the response? if nothing, how it could manifest and under which circumstances?'
		),
	how_to_fix: z
		.string()
		.nullable()
		.optional()
		.describe('Your recommendation for how to fix the issue if it is possible'),
	severity: z
		.enum(['low', 'medium', 'high'])
		.describe(
			'The severity of the issue: high means it is a major discrepancy that manifests in the response, medium means it looks bad but somehow the response is still good, low means there is an opportunity for improvement (e.g. remove un-needed repetition, fix typos,improve wording, etc.)'
		)
});

const deepAnalysisOutputSchema = z.object({
	result: z.union([
		z.object({
			issues: z.array(issueWithoutCategorySchema)
		}),
		z.literal(NO_ISSUES_FOUND)
	])
});

const dedupAgentSchema = z.object({
	issueIndexesToRemove: z
		.array(z.number())
		.optional()
		.nullable()
		.describe(
			'The indexes of the issues to remove if any. This are duplicates that should be removed.'
		)
});

function getAnalysisCategoryPrompt(category: { name: string; description: string }) {
	return `
	## Issues to Look For (IF YOU SEE ISSUES OUTSIDE OF THIS CATEGORY, IGNORE THEM!)

	### ${category.name}
	${category.description}
	---
	`;
}

const deepAnalysisSystemPrompt = `
	# Role
	You are an expert in prompt and context engineering for LLMs with sharp attention to details.

	# Goal
	Your goal is to help engineer better prompts for the LLM. To gain their trust avoid false positives. Be critical and fair and make sure to be as specific as possible.

	# Task
	You will get an exchange of inputs and outputs from a LLM, the endpoint that was called and one category of issues to look for.

	Your task is to look at the instructions passed to the LLM as a whole:
	- System prompt
	- The user prompt prefix/suffix that wrap the user query (if any) - but not the user query itself (use your best judgment and err on the side of caution)
	- Tool descriptions, parameters and output shapes
	- Output schema descriptions
	Tip: in order to understand which model is being used, look at the model name in either the API url or the request body. If unknown use yourself as reference.
	
	**Model Capability Assessment:**
	When evaluating complexity relative to model capabilities, consider the model tier:
	- **Reasoning models** (o3, GPT 5, Gemini-2.5-Pro, Claude-3.5-Sonnet with reasoning): Handle complex multi-step tasks, ~100 simultaneous instructions
	- **Top non-reasoning models** (GPT-4.1, Claude Sonnet-4, GPT-4o): Strong instruction following, ~50 simultaneous instructions  
	- **Standard models** (GPT-4, Claude-3, Llama variants): Good general capability, fewer simultaneous instructions
	- **Weaker/older models**: Limited instruction-following capacity, prone to exponential performance decay

	# Important Context About Structured Outputs
	**When analyzing requests that use structured outputs (strict JSON schemas):**
	
	Structured outputs are designed for complex schemas and GUARANTEE valid JSON. When you detect structured outputs usage, do NOT flag these as issues:
	
	**DO NOT flag:**
	- Missing "output only JSON" instructions
	- Missing "no quotes or markdown" instructions  
	- Missing JSON formatting guidance
	- Missing explicit JSON output requirements when schema is provided via text.format (or its equivalents)
	- Complex, deeply nested JSON schemas unless in contains redundant information or properties 
	- Large text fields within JSON structures
	- Multiple nested objects and arrays
	- Long narrative content in string fields
	
	**Signs of structured outputs usage:**
	- Request includes \`"strict": true\` in schema definition
	- Request uses \`text.format\` with schema validation
	- API endpoint uses structured response parsing


	**In general**: Put yourself in the shoes of the LLM (if it is a weaker model, simulate it) and try to imagine what it would do.

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

	- **Example of correct concise output (might be in a different category than yours, they just demonstrate the format):**
	- System forbids emojis
	- User prompt encourages emojis
	
	In system prompt:
	> "Never use emojis."
	
	In user prompt:
	> "### Reminder: use emojis when appropriate."

	### EXCEPTION 2: If you observed an effect on the output you must mention it in the effect section to make the user aware of it.
	---
	When you're done analyzing please check your work carefully and make sure you didn't miss anything. Thanks!
	`;

export async function deepAnalyzeLLMExchange(
	conversation: string
): Promise<z.infer<typeof analysisOutputSchema>> {
	const analysisPromises = analysisCategories.map(async (category) => {
		const categoryInstructions = getAnalysisCategoryPrompt(category);
		// Notice the prompt is structured to maximize the LLM cache hit rate by putting the conversation at the end of the prompt.
		// The first exchange makes all the calls in parallel so we can't hope for cache hits but the next ones will benefit from it.
		return {
			category,
			analysis: await callModel({
				input: [
					{ role: 'system', content: `${deepAnalysisSystemPrompt}\n---\n${categoryInstructions}` },
					{
						role: 'user',
						content: `Please analyze this LLM exchange for prompt engineering issues:\n\n${conversation}`
					}
				],
				outputSchema: deepAnalysisOutputSchema,
				model: 'o3-2025-04-16'
			})
		};
	});
	const analysisResults = await Promise.all(analysisPromises);

	// Add the category to the issues to match the expected return type
	const issues = analysisResults
		.map(({ category, analysis }) =>
			analysis.result !== NO_ISSUES_FOUND
				? analysis.result.issues.map(
						(issue) => ({ ...issue, category: category.key }) as z.infer<typeof issueSchema>
					)
				: []
		)
		.filter((res) => res.length > 0)
		.flat();
	if (issues.length === 0) {
		return {
			result: NO_ISSUES_FOUND
		};
	}

	const categories = [...new Set(issues.map((issue) => issue.category))];
	if (categories.length === 1) {
		return {
			result: {
				issues
			}
		};
	}

	const { issueIndexesToRemove } = await callModel({
		input: [
			{
				role: 'system',
				content: `
			You are a helpful assistant that deduplicates issues found in a LLM exchanges. 
			You will be given a list of issues with their indexes. Issues in each category were collected independently therefore there can be intersections between categories, resulting in duplicates.
			A duplicate doesn't mean identical, it means they are similar enough such that if one is fixed, the other is redundant.
			Your goal is to provide the user with a concise, high quality list of issues to fix without duplicates.
			When you see duplicates, remove the the lower quality one (e.g. with the less suitable category/ worse diagnosis/ worse fix recommendation).
			**Important**: Don't remove issues that are distinctively different from each other even if you disagree with the diagnosis or fix recommendation.
			`
			},
			{
				role: 'user',
				content: `
			## Context
			The issues were collected independently from each category from this exchange:
			${conversation}
			---
			## Issues
			Please deduplicate the following issues:
			${issues.map((issue, idx) => `- **Index**: ${idx}, issue: ${JSON.stringify(issue)}`).join('\n')}
		`
			}
		],
		outputSchema: dedupAgentSchema,
		model: 'gpt-4.1-2025-04-14'
	});
	return {
		result: {
			issues: issues.filter((_, idx) => !issueIndexesToRemove?.includes(idx))
		}
	};
}

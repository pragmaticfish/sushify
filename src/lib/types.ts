/**
 * Central type definitions for Sushify
 * All types are shared across the application to avoid duplication
 */

import { z } from 'zod';

export const NO_ISSUES_FOUND = 'no issues found';

const issueSchema = z.object({
	category: z.enum([
		'contradictory',
		'vague',
		'misleading',
		'missing',
		'over_complexity',
		'bad_prompt_structure',
		'other'
	]),
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

export const analysisOutputSchema = z.object({
	result: z.union([
		z.object({
			issues: z.array(issueSchema)
		}),
		z.literal(NO_ISSUES_FOUND)
	])
});

export type AnalysisIssue = z.infer<typeof issueSchema> & { id: string };

// Enhanced analysis result type used throughout the application
export type AnalysisResult = {
	result:
		| typeof NO_ISSUES_FOUND
		| {
				issues: AnalysisIssue[];
		  };
};

/**
 * Exchange data structure matching the interceptor.py output
 */
export type Exchange = {
	id: string;
	timestamp: number;
	url: string;
	method: string;
	host: string;
	path: string;
	scheme: string;
	request_headers: Record<string, string>;
	request_body: string | null;
	response_status: number | null;
	response_headers: Record<string, string>;
	response_body: string | null;
	latency_ms: number;
	captured_at: string;
	server_received_at?: string; // Added by server
	error_details?: string; // Raw error message for failed requests
	analysis_result?: AnalysisResult | null; // Analysis result if available
	// Note: is_ai_request removed - we only capture AI requests anyway
};

/**
 * API response types
 */
export type CaptureStatusResponse = {
	capturing: boolean;
	sessionId: string | null;
	startedAt: Date | null;
};

export type ExchangesResponse = {
	exchanges: Exchange[];
	total: number;
};

export type CaptureToggleRequest = {
	action: 'enable' | 'disable';
};

export type CaptureToggleResponse = {
	success: true;
	capturing: boolean;
	sessionId: string | null;
	message: string;
};

export type ApiSuccessResponse = {
	success: true;
	id: string;
	message: string;
};

export type ApiErrorResponse = {
	error: string;
};

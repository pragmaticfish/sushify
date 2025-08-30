/**
 * Central type definitions for Sushify
 * All types are shared across the application to avoid duplication
 */

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
	response_status: number;
	response_headers: Record<string, string>;
	response_body: string | null;
	latency_ms: number;
	captured_at: string;
	is_ai_request: boolean;
	server_received_at?: string; // Added by server
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

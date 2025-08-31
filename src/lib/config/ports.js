/**
 * Centralized port configuration for Sushify
 *
 * These ports are chosen to avoid common development tool conflicts:
 * - 7331: Dashboard (less common than 3000-3010 range)
 * - 7332: Proxy (less common than 8080, 8000 range)
 */

export const PORTS = {
	/** SvelteKit dashboard server port */
	DASHBOARD: 7331,

	/** mitmproxy HTTP(S) proxy port */
	PROXY: 7332
};

/**
 * Get the dashboard URL
 * @returns {string} Full dashboard URL
 */
export function getDashboardUrl() {
	return `http://localhost:${PORTS.DASHBOARD}`;
}

/**
 * Get the proxy URL for environment variables
 * @returns {string} Full proxy URL
 */
export function getProxyUrl() {
	return `http://localhost:${PORTS.PROXY}`;
}

/**
 * Get the dashboard API base URL (IPv4 explicit for Node.js fetch)
 * @returns {string} Dashboard API base URL
 */
export function getDashboardApiUrl() {
	return `http://127.0.0.1:${PORTS.DASHBOARD}`;
}

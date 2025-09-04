// Shared capture state between form actions and API endpoints
import { getLogger } from '../utils/logging.js';

let isCapturing = true;

export function getCaptureState(): boolean {
	return isCapturing;
}

export function setCaptureState(capturing: boolean): void {
	// Only log if state actually changes
	if (isCapturing !== capturing) {
		isCapturing = capturing;
		const message = isCapturing ? 'Proxy capture enabled' : 'Proxy capture disabled';
		getLogger().info(`[capture] ${message}`);
	}
}

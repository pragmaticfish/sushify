import path from 'path';
import fs from 'fs';

let serverLogPath: string | null = null;

export interface Logger {
	info: (message: string) => void;
	error: (message: string) => void;
	warn: (message: string) => void;
	debug: (message: string) => void;
}

/**
 * Get logger that writes to server.log in the session directory
 */
export function getLogger(): Logger {
	if (!serverLogPath) {
		const sessionDir = process.env.SUSHIFY_SESSION_DIR;
		if (!sessionDir) {
			throw new Error('SUSHIFY_SESSION_DIR environment variable not set');
		}
		serverLogPath = path.join(sessionDir, 'server.log');
	}

	return {
		info: (message: string) => logMessage('INFO', message),
		error: (message: string) => logMessage('ERROR', message),
		warn: (message: string) => logMessage('WARN', message),
		debug: (message: string) => logMessage('DEBUG', message)
	};
}

/**
 * Write structured log message to server.log (identical to Python interceptor)
 */
function logMessage(level: string, message: string): void {
	if (!serverLogPath) return;

	const timestamp = new Date()
		.toISOString()
		.replace('T', ' ')
		.replace(/\.\d{3}Z/, '');
	const logLine = `${timestamp} ${level.padEnd(5)} ${message}\n`;

	try {
		fs.appendFileSync(serverLogPath, logLine);
	} catch {
		// Silent fail - don't throw from logger
	}
}

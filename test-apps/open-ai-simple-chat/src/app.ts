import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';
import { callModel, type Message } from './llm';

// ------------------ SETUP ------------------

const indexHtml = readFileSync(resolve(__dirname, 'index.html'), 'utf8');

const server = createServer((req, res) => {
	if (req?.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		res.end(indexHtml);
		return;
	}
	res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end('Not Found');
});

const wss = new WebSocketServer({ server });

const port = 8081;

// --------------- CONNECTION ----------------

wss.on('connection', (ws) => {
	console.log('Connection established');
	ws.on('error', console.error);

	// Keep simple per-connection chat history
	const history: Message[] = [
		{ role: 'system', content: 'You are a concise and helpful assistant. Never use emojis.' }
	];

	ws.on('message', async (data) => {
		try {
			const payload = JSON.parse(data as unknown as string);
			console.log('Message received', payload);

			// Deep Chat sends the request body; try to robustly extract the latest user text
			// Common shapes: {messages:[{text: '...'}]}, {text:'...'}
			let userText: string | undefined;
			if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
				const last = payload.messages[payload.messages.length - 1];
				userText = last?.text ?? last?.message ?? last?.content;
			} else if (typeof payload?.text === 'string') {
				userText = payload.text;
			} else if (typeof payload?.message === 'string') {
				userText = payload.message;
			}

			if (!userText || userText.trim().length === 0) {
				ws.send(JSON.stringify({ text: 'Please send a non-empty message.' }));
				return;
			}

			history.push({
				role: 'user',
				content: `The user said: ${userText}. ### Reminder: use emojis when appropriate.`
			});

			const schema = z.object({ response: z.string() });
			const result = await callModel({
				input: history,
				outputSchema: schema
			});

			const assistantText = result.response;
			history.push({ role: 'assistant', content: assistantText });

			// Send Deep Chat response format
			ws.send(JSON.stringify({ text: assistantText }));
		} catch (err) {
			console.error('Error handling message', err);
			ws.send(JSON.stringify({ text: 'Sorry, something went wrong processing your message.' }));
		}
	});
});

// ------------------ START SERVER ------------------

server.listen(port, () => {
	console.log(`🚀 OpenAI Chat Server started`);
	console.log(`📱 Web interface: http://localhost:${port}`);
	console.log(`🔌 WebSocket endpoint: ws://localhost:${port}`);
	console.log(`💬 Ready to chat with AI! Open the web interface to start.`);
});

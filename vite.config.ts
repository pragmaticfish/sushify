import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Plugin to copy CLI files to build directory
const copyCliPlugin = () => {
	return {
		name: 'copy-cli',
		closeBundle: async () => {
			try {
				// Use a delay to ensure adapter-node has finished
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Create lib directory in build
				await mkdir(join('build', 'lib'), { recursive: true });
				await mkdir(join('build', 'lib', 'cli'), { recursive: true });
				await mkdir(join('build', 'lib', 'config'), { recursive: true });
				await mkdir(join('build', 'lib', 'proxy'), { recursive: true });

				// Copy CLI files
				await copyFile(
					join('src', 'lib', 'cli', 'start-command.js'),
					join('build', 'lib', 'cli', 'start-command.js')
				);
				await copyFile(
					join('src', 'lib', 'config', 'ports.js'),
					join('build', 'lib', 'config', 'ports.js')
				);

				// Copy proxy files (interceptor and certificate manager)
				await copyFile(
					join('src', 'lib', 'proxy', 'interceptor.py'),
					join('build', 'lib', 'proxy', 'interceptor.py')
				);
				await copyFile(
					join('src', 'lib', 'proxy', 'certificate-manager.js'),
					join('build', 'lib', 'proxy', 'certificate-manager.js')
				);

				console.log('✅ Copied CLI files to build directory');
			} catch (error) {
				console.error('❌ Failed to copy CLI files:', error);
				throw error;
			}
		}
	};
};

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson(), copyCliPlugin()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

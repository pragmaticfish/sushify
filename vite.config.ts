import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { build } from 'esbuild';

// Plugin to build and copy CLI files to build directory
const buildCliPlugin = () => {
	return {
		name: 'build-cli',
		closeBundle: async () => {
			try {
				// Use a delay to ensure adapter-node has finished
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Create directories for the new structure
				await mkdir(join('build', 'src', 'lib', 'proxy'), { recursive: true });

				// Build TypeScript files to JavaScript
				await build({
					entryPoints: ['src/**/*.ts', 'bin/**/*.ts'],
					outdir: 'build',
					format: 'esm',
					platform: 'node',
					target: 'node18',
					bundle: false,
					sourcemap: false,
					keepNames: true,
					outExtension: { '.js': '.js' },
					outbase: '.'
				});

				// Copy Python interceptor (no transpilation needed)
				await copyFile(
					join('src', 'lib', 'proxy', 'interceptor.py'),
					join('build', 'src', 'lib', 'proxy', 'interceptor.py')
				);

				console.log('✅ Built and copied CLI files to build directory');
			} catch (error) {
				console.error('❌ Failed to build CLI files:', error);
				throw error;
			}
		}
	};
};

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson(), buildCliPlugin()],
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

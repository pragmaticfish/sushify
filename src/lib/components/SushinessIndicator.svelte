<script lang="ts">
	type SushinessLevel = 'red' | 'orange' | 'yellow' | 'green' | 'computing' | 'disabled';

	let {
		level,
		onclick
	}: {
		level: SushinessLevel;
		onclick?: (e: Event) => void;
	} = $props();

	function getTooltip(level: SushinessLevel): string {
		switch (level) {
			case 'red':
				return 'High severity issues found in prompt analysis';
			case 'orange':
				return 'Medium severity issues found';
			case 'yellow':
				return 'Low severity issues found';
			case 'green':
				return 'No issues found - good prompt quality';
			case 'computing':
				return 'Analysis in progress...';
			case 'disabled':
				return 'Analysis disabled - set OPENAI_API_KEY to enable prompt analysis';
		}
	}
</script>

{#if level === 'computing'}
	<div class="indicator-container">
		<div class="sushiness-spinner" title={getTooltip(level)}></div>
	</div>
{:else}
	<button class="indicator-button" title={getTooltip(level)} {onclick}>
		{#if level === 'disabled'}
			<div class="sushiness-disabled"></div>
		{:else if level === 'red'}
			🔴
		{:else if level === 'orange'}
			🟠
		{:else if level === 'yellow'}
			🟡
		{:else}
			🟢
		{/if}
	</button>
{/if}

<style>
	/* Your awesome spinner! */
	.sushiness-spinner {
		width: 20px;
		height: 20px;
		min-height: 20px;
		border-radius: 50%;
		border: 5px solid red;
		margin: 0 auto;
		box-sizing: border-box;
		-webkit-animation: sushiness-spinner 8s infinite linear;
		animation: sushiness-spinner 8s infinite linear;
	}

	@-webkit-keyframes sushiness-spinner {
		0%,
		100% {
			border: solid 10px #68c3a3;
		}
		6.25% {
			border: solid 1px #68c3a3;
		}
		12.5% {
			border: solid 1px #52b3d9;
		}
		18.75% {
			border: solid 10px #52b3d9;
		}
		25% {
			border: solid 10px #52b3d9;
		}
		31.25% {
			border: solid 1px #52b3d9;
		}
		37.5% {
			border: solid 1px #f4d03f;
		}
		43.75% {
			border: solid 10px #f4d03f;
		}
		50% {
			border: solid 10px #f4d03f;
		}
		56.25% {
			border: solid 1px #f4d03f;
		}
		62.5% {
			border: solid 1px #d24d57;
		}
		68.75% {
			border: solid 10px #d24d57;
		}
		75% {
			border: solid 10px #d24d57;
		}
		81.25% {
			border: solid 1px #d24d57;
		}
		87.5% {
			border: solid 1px #68c3a3;
		}
		93.75% {
			border: solid 10px #68c3a3;
		}
	}

	@keyframes sushiness-spinner {
		0%,
		100% {
			border: solid 10px #68c3a3;
		}
		6.25% {
			border: solid 1px #68c3a3;
		}
		12.5% {
			border: solid 1px #52b3d9;
		}
		18.75% {
			border: solid 10px #52b3d9;
		}
		25% {
			border: solid 10px #52b3d9;
		}
		31.25% {
			border: solid 1px #52b3d9;
		}
		37.5% {
			border: solid 1px #f4d03f;
		}
		43.75% {
			border: solid 10px #f4d03f;
		}
		50% {
			border: solid 10px #f4d03f;
		}
		56.25% {
			border: solid 1px #f4d03f;
		}
		62.5% {
			border: solid 1px #d24d57;
		}
		68.75% {
			border: solid 10px #d24d57;
		}
		75% {
			border: solid 10px #d24d57;
		}
		81.25% {
			border: solid 1px #d24d57;
		}
		87.5% {
			border: solid 1px #68c3a3;
		}
		93.75% {
			border: solid 10px #68c3a3;
		}
	}

	/* Sushiness Disabled Indicator */
	.sushiness-disabled {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-color: #d1d5db;
		margin: 0 auto;
		border: 2px solid #9ca3af;
		opacity: 0.6;
	}

	.indicator-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
	}

	.indicator-button {
		width: 100%;
		height: 100%;
		min-height: 48px;
		background: transparent;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		transition: background-color 0.15s ease;
		outline: none;
		border-radius: 4px;
		margin: 0;
		padding: 0;
	}

	.indicator-button:hover {
		background: rgba(59, 130, 246, 0.1);
	}

	.indicator-button:active {
		background: rgba(59, 130, 246, 0.2);
		transform: scale(0.98);
	}

	.indicator-button:focus {
		background: rgba(59, 130, 246, 0.1);
		box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.4);
	}
</style>

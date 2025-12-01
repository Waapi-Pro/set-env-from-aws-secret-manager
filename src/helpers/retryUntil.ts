import { setTimeout } from "node:timers/promises";

export async function retryUntil<Fn extends () => any>(params: {
	fn: Fn;
	maxRetries?: number;
	backOff?: {
		initialDelay: number;
		maxDelay?: number;
	};
}): Promise<Awaited<ReturnType<Fn>>> {
	const { fn, maxRetries = 3, backOff } = params;
	const { initialDelay = 1000, maxDelay = 10000 } = backOff ?? {};

	let remainingRetries = maxRetries;
	let nextDelay = initialDelay;

	let lastError: unknown;
	do {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (remainingRetries === 0) {
				throw lastError;
			}
			await setTimeout(nextDelay);

			remainingRetries--;
			nextDelay = Math.min(nextDelay * 2, maxDelay);
		}
	} while (remainingRetries > 0);

	throw lastError;
}

import { setTimeout } from "node:timers/promises";

export async function retryUntil<Fn extends () => any>(params: {
	fn: Fn;
	maxRetries?: number;
	backOff?: {
		initialDelay: number;
		maxDelay?: number;
	};
}): Promise<Awaited<ReturnType<Fn>>> {
	const {
		fn,
		maxRetries = 3,
		backOff = {
			initialDelay: 1000,
			maxDelay: 10000,
		},
	} = params;
	const { initialDelay, maxDelay } = backOff;

	let remainingRetries = maxRetries;
	let nextDelay = initialDelay;

	do {
		try {
			return await fn();
		} catch (error) {
			if (remainingRetries === 0) {
				throw error;
			}
			await setTimeout(nextDelay);

			remainingRetries--;
			nextDelay = Math.min(nextDelay * 2, maxDelay);
		}
	} while (remainingRetries > 0);
}

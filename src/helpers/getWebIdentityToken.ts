import * as core from "@actions/core";
import { getErrorMessage } from "./getErrorMessage";
import { retryUntil } from "./retryUntil";
import type { CustomResponse } from "../types/CustomResponse";

export async function getWebIdentityToken(params?: {
	audience?: string;
}): Promise<CustomResponse<string, string>> {
	const { audience } = params ?? {};

	try {
		const webIdentityToken = await retryUntil({
			fn: async () => {
				return await core.getIDToken(audience);
			},
		});

		return {
			hasFailed: false,
			data: webIdentityToken,
		};
	} catch (error) {
		return {
			hasFailed: true,
			errorCode: "getIDToken_call_exhausted_retries",
			errorMessage: getErrorMessage(error),
		};
	}
}

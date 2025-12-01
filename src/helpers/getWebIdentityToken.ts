import * as core from "@actions/core";
import type { CustomResponse } from "../types/CustomResponse";
import { getErrorMessage } from "./getErrorMessage";
import { retryUntil } from "./retryUntil";

export async function getWebIdentityToken(params?: {
	audience?: string;
}): Promise<CustomResponse<string, string>> {
	const { audience } = params ?? {};

	try {
		core.info(`Getting web identity token for audience: ${audience}`);
		const webIdentityToken = await retryUntil({
			fn: async () => {
				return await core.getIDToken(audience);
			},
		});
		core.info(`Got web identity token: ${webIdentityToken}`);

		if (!webIdentityToken) {
			return {
				hasFailed: true,
				errorCode: "web_identity_token_is_empty",
				errorMessage: `getIDToken call returned: ${webIdentityToken}`,
			};
		}

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

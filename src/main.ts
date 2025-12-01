import * as core from "@actions/core";
import {
	ResourceNotFoundException,
	SecretsManager,
} from "@aws-sdk/client-secrets-manager";
import type { Credentials } from "@aws-sdk/client-sts";
import { getErrorMessage } from "./helpers/getErrorMessage";
import { getWebIdentityToken } from "./helpers/getWebIdentityToken";
import { getOidcClient } from "./oidcClient";
import type { CustomResponse } from "./types/CustomResponse";

async function getCredentials(params: {
	region: string;
	roleArn: string;
	webIdentityToken: string;
	roleSessionName?: string;
}): Promise<CustomResponse<Credentials, string>> {
	const { assumeRoleWithWebIdentity } = getOidcClient(params);

	try {
		const response = await assumeRoleWithWebIdentity();
		if (response.hasFailed === true) {
			return response;
		}

		return {
			hasFailed: false,
			data: response.data,
		};
	} catch (error) {
		return {
			hasFailed: true,
			errorCode: "failed_to_assume_role_with_web_identity",
			errorMessage: getErrorMessage(error),
		};
	}
}

async function getSecretValue(params: {
	credentials: Credentials;
	region: string;
	profile?: string;
	secretName: string;
}): Promise<CustomResponse<Record<string, string>, string>> {
	const { credentials, region, profile, secretName } = params;

	if (
		!credentials.AccessKeyId ||
		!credentials.SecretAccessKey ||
		!credentials.SessionToken
	) {
		return {
			hasFailed: true,
			errorCode: "credentials_are_not_valid",
			errorMessage: "Credentials are not valid",
		};
	}

	const secretManagerClient = new SecretsManager({
		region,
		profile,
		credentials: {
			accessKeyId: credentials.AccessKeyId,
			secretAccessKey: credentials.SecretAccessKey,
			sessionToken: credentials.SessionToken,
			expiration: credentials.Expiration,
		},
	});

	try {
		const secret = await secretManagerClient.getSecretValue({
			SecretId: secretName,
		});

		if (!secret.SecretString) {
			return {
				hasFailed: true,
				errorCode: "secret_is_not_a_string",
				errorMessage: `Secret ${secretName} is not a string`,
			};
		}

		const secretValue = JSON.parse(secret.SecretString);
		if (secretValue === null) {
			return {
				hasFailed: true,
				errorCode: "secret_is_null",
				errorMessage: `Secret ${secretName} is null`,
			};
		}
		if (typeof secretValue !== "object") {
			return {
				hasFailed: true,
				errorCode: "secret_is_not_an_object",
				errorMessage: `Secret ${secretName} is not an object`,
			};
		}

		for (const [key, value] of Object.entries(secretValue)) {
			if (typeof value !== "string") {
				return {
					hasFailed: true,
					errorCode: "secret_value_is_not_a_string",
					errorMessage: `Secret ${secretName} value ${key} is not a string`,
				};
			}
		}

		return {
			hasFailed: false,
			data: secretValue,
		};
	} catch (error) {
		if (error instanceof SyntaxError) {
			return {
				hasFailed: true,
				errorCode: "secret_is_not_a_valid_json",
				errorMessage: `Secret ${secretName} is not a valid JSON`,
			};
		}
		if (error instanceof ResourceNotFoundException) {
			return {
				hasFailed: true,
				errorCode: "secret_not_found",
				errorMessage: `Secret ${secretName} not found`,
			};
		}
		if (error instanceof Error) {
			return {
				hasFailed: true,
				errorCode: "unhandled_error",
				errorMessage: error.message,
			};
		}
		return {
			hasFailed: true,
			errorCode: "unknown_error",
			errorMessage: "Unknown error",
		};
	}
}

export async function run(): Promise<void> {
	const secretName = core.getInput("aws_secret_name", {
		required: true,
		trimWhitespace: true,
	});
	const roleArn = core.getInput("aws_role_arn", {
		required: true,
		trimWhitespace: true,
	});
	const region = core.getInput("aws_region", {
		required: true,
		trimWhitespace: true,
	});
	const profile = core.getInput("aws_profile", {
		required: false,
		trimWhitespace: true,
	});

	const getWebIdentityTokenResponse = await getWebIdentityToken();
	if (getWebIdentityTokenResponse.hasFailed === true) {
		core.setFailed(
			`Failed to get web identity token:\n[${getWebIdentityTokenResponse.errorCode}] ${getWebIdentityTokenResponse.errorMessage}`,
		);
		return;
	}

	const { data: webIdentityToken } = getWebIdentityTokenResponse;
	const getCredentialsResponse = await getCredentials({
		region,
		roleArn,
		webIdentityToken,
	});
	if (getCredentialsResponse.hasFailed === true) {
		core.setFailed(
			`Failed to to get AWS credentials:\n[${getCredentialsResponse.errorCode}] ${getCredentialsResponse.errorMessage}`,
		);
		return;
	}

	const { data: awsCredentials } = getCredentialsResponse;
	const getSecretValueResponse = await getSecretValue({
		credentials: awsCredentials,
		region,
		profile,
		secretName,
	});
	if (getSecretValueResponse.hasFailed === true) {
		core.setFailed(
			`Failed to get secret value:\n[${getSecretValueResponse.errorCode}] ${getSecretValueResponse.errorMessage}`,
		);
		return;
	}

	const { data: secretValue } = getSecretValueResponse;
	for (const [key, value] of Object.entries(secretValue)) {
		core.debug(`Setting ${key}`);
		core.exportVariable(key, value);
		core.setSecret(value);
	}

	core.debug("Done");
}

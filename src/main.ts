import * as core from "@actions/core";
import {
	ResourceNotFoundException,
	SecretsManager,
} from "@aws-sdk/client-secrets-manager";
import { fromEnv } from "@aws-sdk/credential-provider-env";

export async function run(): Promise<void> {
	const secretName = core.getInput("secret_name", {
		required: true,
		trimWhitespace: true,
	});
	const region = core.getInput("region", {
		required: true,
		trimWhitespace: true,
	});
	const profile = core.getInput("profile", {
		required: false,
		trimWhitespace: true,
	});

	const secretManagerClient = new SecretsManager({
		region,
		credentials: fromEnv(),
		profile,
	});

	try {
		const secret = await secretManagerClient.getSecretValue({
			SecretId: secretName,
		});

		if (!secret.SecretString) {
			core.setFailed(`Secret ${secretName} is not a string`);
			return;
		}

		const secretValue = JSON.parse(secret.SecretString);
		if (secretValue === null) {
			core.setFailed(`Secret ${secretName} is null`);
			return;
		}
		if (typeof secretValue !== "object") {
			core.setFailed(`Secret ${secretName} is not an object`);
			return;
		}

		for (const [key, value] of Object.entries(secretValue)) {
			if (typeof value !== "string") {
				core.setFailed(`Secret ${secretName} value ${key} is not a string`);
				return;
			}

			core.debug(`Setting ${key}`);
			core.exportVariable(key, value);
			core.setSecret(value);
		}
	} catch (error) {
		if (error instanceof SyntaxError) {
			core.setFailed(`Secret ${secretName} is not a valid JSON`);
		} else if (error instanceof ResourceNotFoundException) {
			core.setFailed(`Secret ${secretName} not found`);
		} else if (error instanceof Error) {
			core.setFailed(error.message);
		} else {
			core.setFailed("Unknown error");
		}
	}

	core.debug("Done");
}

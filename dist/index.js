import { s as __toESM } from "./rolldown-runtime-waC_Q_pm.js";
import { at as require_core, nt as require_dist_cjs, rt as require_dist_cjs$1 } from "./vendor-Dxz631VJ.js";
import { setTimeout } from "node:timers/promises";

//#region src/helpers/getErrorMessage.ts
var import_dist_cjs = require_dist_cjs$1();
var import_core$2 = /* @__PURE__ */ __toESM(require_core(), 1);
function getErrorMessage(error) {
	if (error instanceof Error) return `[${error.name}] ${error.message}`;
	if (typeof error === "string") return error;
	const errorMessage = JSON.stringify(error);
	return errorMessage.length > 0 ? errorMessage.slice(0, 100) : errorMessage;
}

//#endregion
//#region src/helpers/retryUntil.ts
async function retryUntil(params) {
	const { fn, maxRetries = 3, backOff } = params;
	const { initialDelay = 1e3, maxDelay = 1e4 } = backOff ?? {};
	let remainingRetries = maxRetries;
	let nextDelay = initialDelay;
	do
		try {
			return await fn();
		} catch (error) {
			if (remainingRetries === 0) throw error;
			await setTimeout(nextDelay);
			remainingRetries--;
			nextDelay = Math.min(nextDelay * 2, maxDelay);
		}
	while (remainingRetries > 0);
	throw new Error("RetryUntil: No retries left");
}

//#endregion
//#region src/helpers/getWebIdentityToken.ts
async function getWebIdentityToken(params) {
	const { audience } = params ?? {};
	try {
		import_core$2.info(`Getting web identity token for audience: ${audience}`);
		const webIdentityToken = await retryUntil({ fn: async () => {
			return await import_core$2.getIDToken(audience ? audience : void 0);
		} });
		import_core$2.info(`Got web identity token: ${webIdentityToken}`);
		if (!webIdentityToken) return {
			hasFailed: true,
			errorCode: "web_identity_token_is_empty",
			errorMessage: `getIDToken call returned: ${webIdentityToken}`
		};
		return {
			hasFailed: false,
			data: webIdentityToken
		};
	} catch (error) {
		return {
			hasFailed: true,
			errorCode: "getIDToken_call_exhausted_retries",
			errorMessage: getErrorMessage(error)
		};
	}
}

//#endregion
//#region src/oidcClient.ts
var import_core$1 = /* @__PURE__ */ __toESM(require_core(), 1);
var import_dist_cjs$1 = require_dist_cjs();
const USER_AGENT = "github-actions/set-env-from-aws-secret-manager";
const DEFAULT_ROLE_DURATION_SECONDS = 3600;
const DEFAULT_ROLE_SESSION_NAME = "GitHubActions";
function isRoleArn(roleArn) {
	return roleArn.startsWith("arn:aws");
}
function getOidcClient(params) {
	const { region, roleArn: initialRoleArn, webIdentityToken: initialWebIdentityToken, roleSessionName: roleSessionNameParam } = params;
	const roleSessionName = roleSessionNameParam ?? DEFAULT_ROLE_SESSION_NAME;
	if (!isRoleArn(initialRoleArn)) throw new Error("Invalid roleArn");
	const stsClient = new import_dist_cjs$1.STS({
		customUserAgent: USER_AGENT,
		region
	});
	async function assumeRoleWithWebIdentity(params$1) {
		const { roleArn = initialRoleArn, webIdentityToken = initialWebIdentityToken } = params$1 ?? {};
		import_core$1.info("Assuming role with OIDC");
		try {
			const commandInput = {
				RoleArn: roleArn,
				RoleSessionName: roleSessionName,
				DurationSeconds: DEFAULT_ROLE_DURATION_SECONDS
			};
			import_core$1.info(`Assuming role with OIDC:\n${JSON.stringify(commandInput, null, 2)}`);
			const assumeRoleResponse = await stsClient.send(new import_dist_cjs$1.AssumeRoleWithWebIdentityCommand({
				...commandInput,
				WebIdentityToken: webIdentityToken
			}));
			if (!assumeRoleResponse.Credentials) return {
				hasFailed: true,
				errorCode: "failed_to_retrieve_credentials_using_web_identity",
				errorMessage: "No credentials returned from STS client"
			};
			return {
				hasFailed: false,
				data: assumeRoleResponse.Credentials
			};
		} catch (error) {
			return {
				hasFailed: true,
				errorCode: "failed_to_assume_role_with_web_identity",
				errorMessage: getErrorMessage(error)
			};
		}
	}
	stsClient.config.credentials;
	return { assumeRoleWithWebIdentity };
}

//#endregion
//#region src/main.ts
var import_core = /* @__PURE__ */ __toESM(require_core(), 1);
async function getCredentials(params) {
	const { assumeRoleWithWebIdentity } = getOidcClient(params);
	try {
		const response = await assumeRoleWithWebIdentity();
		if (response.hasFailed === true) return response;
		return {
			hasFailed: false,
			data: response.data
		};
	} catch (error) {
		return {
			hasFailed: true,
			errorCode: "failed_to_assume_role_with_web_identity",
			errorMessage: getErrorMessage(error)
		};
	}
}
async function getSecretValue(params) {
	const { credentials, region, profile, secretName } = params;
	if (!credentials.AccessKeyId || !credentials.SecretAccessKey || !credentials.SessionToken) return {
		hasFailed: true,
		errorCode: "credentials_are_not_valid",
		errorMessage: "Credentials are not valid"
	};
	const secretManagerClient = new import_dist_cjs.SecretsManager({
		region,
		profile,
		credentials: {
			accessKeyId: credentials.AccessKeyId,
			secretAccessKey: credentials.SecretAccessKey,
			sessionToken: credentials.SessionToken,
			expiration: credentials.Expiration
		}
	});
	try {
		const secret = await secretManagerClient.getSecretValue({ SecretId: secretName });
		if (!secret.SecretString) return {
			hasFailed: true,
			errorCode: "secret_is_not_a_string",
			errorMessage: `Secret ${secretName} is not a string`
		};
		const secretValue = JSON.parse(secret.SecretString);
		if (secretValue === null) return {
			hasFailed: true,
			errorCode: "secret_is_null",
			errorMessage: `Secret ${secretName} is null`
		};
		if (typeof secretValue !== "object") return {
			hasFailed: true,
			errorCode: "secret_is_not_an_object",
			errorMessage: `Secret ${secretName} is not an object`
		};
		for (const [key, value] of Object.entries(secretValue)) if (typeof value !== "string") return {
			hasFailed: true,
			errorCode: "secret_value_is_not_a_string",
			errorMessage: `Secret ${secretName} value ${key} is not a string`
		};
		return {
			hasFailed: false,
			data: secretValue
		};
	} catch (error) {
		if (error instanceof SyntaxError) return {
			hasFailed: true,
			errorCode: "secret_is_not_a_valid_json",
			errorMessage: `Secret ${secretName} is not a valid JSON`
		};
		if (error instanceof import_dist_cjs.ResourceNotFoundException) return {
			hasFailed: true,
			errorCode: "secret_not_found",
			errorMessage: `Secret ${secretName} not found`
		};
		if (error instanceof Error) return {
			hasFailed: true,
			errorCode: "unhandled_error",
			errorMessage: error.message
		};
		return {
			hasFailed: true,
			errorCode: "unknown_error",
			errorMessage: "Unknown error"
		};
	}
}
async function run() {
	const secretName = import_core.getInput("aws_secret_name", {
		required: true,
		trimWhitespace: true
	});
	const roleArn = import_core.getInput("aws_role_arn", {
		required: true,
		trimWhitespace: true
	});
	const region = import_core.getInput("aws_region", {
		required: true,
		trimWhitespace: true
	});
	const profile = import_core.getInput("aws_profile", {
		required: false,
		trimWhitespace: true
	});
	const githubTokenAudience = import_core.getInput("github_token_audience", {
		required: false,
		trimWhitespace: true
	});
	const getWebIdentityTokenResponse = await getWebIdentityToken(githubTokenAudience ? { audience: githubTokenAudience } : void 0);
	if (getWebIdentityTokenResponse.hasFailed === true) {
		import_core.setFailed(`Failed to get web identity token:\n[${getWebIdentityTokenResponse.errorCode}] ${getWebIdentityTokenResponse.errorMessage}`);
		return;
	}
	const { data: webIdentityToken } = getWebIdentityTokenResponse;
	const getCredentialsResponse = await getCredentials({
		region,
		roleArn,
		webIdentityToken
	});
	if (getCredentialsResponse.hasFailed === true) {
		import_core.setFailed(`Failed to to get AWS credentials:\n[${getCredentialsResponse.errorCode}] ${getCredentialsResponse.errorMessage}`);
		return;
	}
	const { data: awsCredentials } = getCredentialsResponse;
	const getSecretValueResponse = await getSecretValue({
		credentials: awsCredentials,
		region,
		profile,
		secretName
	});
	if (getSecretValueResponse.hasFailed === true) {
		import_core.setFailed(`Failed to get secret value:\n[${getSecretValueResponse.errorCode}] ${getSecretValueResponse.errorMessage}`);
		return;
	}
	const { data: secretValue } = getSecretValueResponse;
	for (const [key, value] of Object.entries(secretValue)) {
		import_core.info(`Setting ${key}`);
		import_core.exportVariable(key, value);
		import_core.setSecret(value);
	}
	import_core.info("Done");
}

//#endregion
//#region src/index.ts
run();

//#endregion
export {  };
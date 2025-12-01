import * as core from "@actions/core";
import {
	AssumeRoleWithWebIdentityCommand,
	STS,
	type AssumeRoleCommandInput,
	type Credentials,
	type Tag,
} from "@aws-sdk/client-sts";
import { getErrorMessage } from "./helpers/getErrorMessage";
import { getGithubEnvironment } from "./helpers/getGithubEnvironment";
import type { CustomResponse } from "./types/CustomResponse";

const USER_AGENT = "github-actions/set-env-from-aws-secret-manager" as const;
const DEFAULT_ROLE_SESSION_NAME = "GitHubActions" as const;

function isRoleArn(roleArn: string) {
	return roleArn.startsWith("arn:aws");
}

export function getOidcClient(params: {
	region: string;
	roleArn: string;
	webIdentityToken: string;
	roleSessionName?: string;
}) {
	const {
		region,
		roleArn: initialRoleArn,
		webIdentityToken: initialWebIdentityToken,
		roleSessionName: roleSessionNameParam,
	} = params;
	const roleSessionName = roleSessionNameParam ?? DEFAULT_ROLE_SESSION_NAME;

	if (!isRoleArn(initialRoleArn)) {
		throw new Error("Invalid roleArn");
	}

	const stsClient = new STS({
		customUserAgent: USER_AGENT,
		region,
	});

	async function assumeRoleWithWebIdentity(params?: {
		roleArn?: string;
		webIdentityToken?: string;
	}): Promise<
		CustomResponse<
			Credentials,
			| "failed_to_assume_role_with_web_identity"
			| "failed_to_retrieve_credentials_using_web_identity"
		>
	> {
		const {
			roleArn = initialRoleArn,
			webIdentityToken = initialWebIdentityToken,
		} = params ?? {};
		core.info("Assuming role with OIDC");
		try {
			const githubEnvironment = getGithubEnvironment();
			const tagArray: Tag[] = [
				{ Key: "GitHub", Value: "Actions" },
				{ Key: "Repository", Value: githubEnvironment.repository },
				{ Key: "Workflow", Value: githubEnvironment.workflow },
				{ Key: "Action", Value: githubEnvironment.action },
				{ Key: "Actor", Value: githubEnvironment.actor },
				{ Key: "Commit", Value: githubEnvironment.sha },
			];
			if (githubEnvironment.ref) {
				tagArray.push({ Key: "Ref", Value: githubEnvironment.ref });
			}
			const commandInput: AssumeRoleCommandInput = {
				RoleArn: roleArn,
				RoleSessionName: roleSessionName,
				Tags: tagArray,
			};

			core.debug(
				`Assuming role with OIDC:\n${JSON.stringify(commandInput, null, 2)}`,
			);
			const assumeRoleResponse = await stsClient.send(
				new AssumeRoleWithWebIdentityCommand({
					...commandInput,
					WebIdentityToken: webIdentityToken,
				}),
			);
			if (!assumeRoleResponse.Credentials) {
				return {
					hasFailed: true,
					errorCode: "failed_to_retrieve_credentials_using_web_identity",
					errorMessage: "No credentials returned from STS client",
				};
			}

			return {
				hasFailed: false,
				data: assumeRoleResponse.Credentials,
			};
		} catch (error) {
			return {
				hasFailed: true,
				errorCode: "failed_to_assume_role_with_web_identity",
				errorMessage: getErrorMessage(error),
			};
		}
	}

	stsClient.config.credentials;

	return { assumeRoleWithWebIdentity };
}

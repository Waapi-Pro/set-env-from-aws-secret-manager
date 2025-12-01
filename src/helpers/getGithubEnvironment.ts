const MAX_TAG_VALUE_LENGTH = 256;
const SANITIZATION_CHARACTER = "_";
// const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/;
// Tags have a more restrictive set of acceptable characters than GitHub environment variables can.
// This replaces anything not conforming to the tag restrictions by inverting the regular expression.
// See the AWS documentation for constraint specifics https://docs.aws.amazon.com/STS/latest/APIReference/API_Tag.html.
export function sanitizeGitHubVariables(name: string) {
	const nameWithoutSpecialCharacters = name.replace(
		/[^\p{L}\p{Z}\p{N}_.:/=+\-@]/gu,
		SANITIZATION_CHARACTER,
	);
	const nameTruncated = nameWithoutSpecialCharacters.slice(
		0,
		MAX_TAG_VALUE_LENGTH,
	);
	return nameTruncated;
}

export function getGithubEnvironment(): {
	repository: string;
	workflow: string;
	action: string;
	actor: string;
	sha: string;
	workspace: string;
	ref?: string;
} {
	const {
		GITHUB_REPOSITORY,
		GITHUB_WORKFLOW,
		GITHUB_ACTION,
		GITHUB_ACTOR,
		GITHUB_SHA,
		GITHUB_WORKSPACE,
		GITHUB_REF,
	} = process.env;

	if (!GITHUB_REPOSITORY) {
		throw new Error("GITHUB_REPOSITORY is not set");
	}
	if (!GITHUB_WORKFLOW) {
		throw new Error("GITHUB_WORKFLOW is not set");
	}
	if (!GITHUB_ACTION) {
		throw new Error("GITHUB_ACTION is not set");
	}
	if (!GITHUB_ACTOR) {
		throw new Error("GITHUB_ACTOR is not set");
	}
	if (!GITHUB_SHA) {
		throw new Error("GITHUB_SHA is not set");
	}
	if (!GITHUB_WORKSPACE) {
		throw new Error("GITHUB_WORKSPACE is not set");
	}

	return {
		repository: GITHUB_REPOSITORY,
		workflow: sanitizeGitHubVariables(GITHUB_WORKFLOW),
		action: GITHUB_ACTION,
		actor: GITHUB_ACTOR,
		sha: GITHUB_SHA,
		workspace: sanitizeGitHubVariables(GITHUB_WORKSPACE),
		ref: GITHUB_REF ? sanitizeGitHubVariables(GITHUB_REF) : undefined,
	};
}

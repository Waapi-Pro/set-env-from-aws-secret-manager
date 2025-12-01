export const DEFAULT_ROLE_DURATION_SECONDS = 3600 as const;
export const DEFAULT_ROLE_SESSION_NAME = "GitHubActions" as const;
export const DEFAULT_GITHUB_TOKEN_AUDIENCE = "sts.amazonaws.com" as const;

export const ACTION_INPUT_KEY = {
	aws_secret_name: "aws_secret_name",
	aws_region: "aws_region",
	aws_profile: "aws_profile",
	aws_role_arn: "aws_role_arn",
	github_token_audience: "github_token_audience",
} as const;

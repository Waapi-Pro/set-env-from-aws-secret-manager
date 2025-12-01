# Set Environment Variables from AWS Secrets Manager

This action allows you to set environment variables in your GitHub Actions workflow using secrets stored in AWS Secrets Manager. It's ideal for securely accessing sensitive information without hardcoding values in your workflows.

## Usage

Add the following to your GitHub Actions workflow YAML file to use this action:

```yaml
- name: Set environment variables from AWS Secrets Manager
  uses: waapi-pro/set-env-from-aws-secret-manager@v0
  with:
    aws_secret_name: my_secret_name
    aws_region: us-east-1
    aws_profile: my-aws-profile # Optional
    aws_role_arn: arn:aws:iam::123456789012:role/MyRole
    github_token_audience: my_audience # Optional, default is sts.amazonaws.com
```
## Inputs
aws_secret_name (required): The name of the secret in AWS Secrets Manager.

aws_region (required): The AWS region where the secret is stored. Default is eu-west-1.

aws_profile (optional): The AWS profile to use for authentication.

aws_role_arn (required): The AWS role ARN to assume.

github_token_audience (optional): The GitHub token audience. Default is sts.amazonaws.com.

## Outputs
env: The environment variables retreived from the AWS Secrets Manager.

## Author
This action was created by youri.pailloux@waalaxy.com.

## Branding
This action is featured with a heart icon and a red color on the GitHub Marketplace.

## Prerequisites
Ensure that your GitHub repository has necessary IAM permissions to access AWS Secrets Manager and assume the specified AWS role.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing
Feel free to submit issues or pull requests for improvements and bug fixes.
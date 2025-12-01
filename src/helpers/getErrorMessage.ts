export function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return `[${error.name}] ${error.message}`;
	}

	if (typeof error === "string") {
		return error;
	}

	const errorMessage = JSON.stringify(error);

	return errorMessage.length > 0 ? errorMessage.slice(0, 100) : errorMessage;
}

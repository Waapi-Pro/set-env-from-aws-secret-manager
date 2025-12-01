export type CustomResponse<Data, ErrorCode extends string> =
	| {
			hasFailed: false;
			data: Data;
	  }
	| {
			hasFailed: true;
			errorCode: ErrorCode;
			errorMessage?: string;
	  };

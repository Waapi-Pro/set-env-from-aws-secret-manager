import { s as __toESM } from "./rolldown-runtime-waC_Q_pm.js";
import { it as require_core, nt as require_dist_cjs, rt as require_dist_cjs$1 } from "./vendor-DzqDatWw.js";

//#region src/main.ts
var import_core = /* @__PURE__ */ __toESM(require_core(), 1);
var import_dist_cjs = require_dist_cjs();
var import_dist_cjs$1 = require_dist_cjs$1();
async function run() {
	const secretName = import_core.getInput("secret-name", {
		required: true,
		trimWhitespace: true
	});
	const region = import_core.getInput("region", {
		required: true,
		trimWhitespace: true
	});
	const profile = import_core.getInput("profile", {
		required: false,
		trimWhitespace: true
	});
	const secretManagerClient = new import_dist_cjs.SecretsManager({
		region,
		credentials: (0, import_dist_cjs$1.fromEnv)(),
		profile
	});
	try {
		const secret = await secretManagerClient.getSecretValue({ SecretId: secretName });
		if (!secret.SecretString) {
			import_core.setFailed(`Secret ${secretName} is not a string`);
			return;
		}
		const secretValue = JSON.parse(secret.SecretString);
		if (secretValue === null) {
			import_core.setFailed(`Secret ${secretName} is null`);
			return;
		}
		if (typeof secretValue !== "object") {
			import_core.setFailed(`Secret ${secretName} is not an object`);
			return;
		}
		for (const [key, value] of Object.entries(secretValue)) {
			if (typeof value !== "string") {
				import_core.setFailed(`Secret ${secretName} value ${key} is not a string`);
				return;
			}
			import_core.debug(`Setting ${key}`);
			import_core.exportVariable(key, value);
			import_core.setSecret(value);
		}
	} catch (error) {
		if (error instanceof SyntaxError) import_core.setFailed(`Secret ${secretName} is not a valid JSON`);
		else if (error instanceof import_dist_cjs.ResourceNotFoundException) import_core.setFailed(`Secret ${secretName} not found`);
		else if (error instanceof Error) import_core.setFailed(error.message);
		else import_core.setFailed("Unknown error");
	}
	import_core.debug("Done");
}

//#endregion
//#region src/index.ts
run();

//#endregion
export {  };
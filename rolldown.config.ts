import { defineConfig } from "rolldown";

export default defineConfig({
	input: "src/index.ts",
	platform: "node",
	tsconfig: "./tsconfig.json",
	output: {
		dir: "./dist",
		cleanDir: true,
		format: "esm",
		minify: false,
		advancedChunks: {
			groups: [
				{
					name: "vendor",
					test: /[\\/]node_modules[\\/]/,
				},
			],
		},
	},
});

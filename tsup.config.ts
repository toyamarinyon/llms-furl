import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["index.ts"],
	format: ["esm"],
	target: "node20",
	outDir: "dist",
	minify: true,
	sourcemap: false,
	banner: {
		js: "#!/usr/bin/env node",
	},
});

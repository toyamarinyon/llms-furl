import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildIndexJson } from "../../index-json.js";
import { type Page, split } from "../../splitter.js";

export interface SplitOptions {
	input: string;
	outputDir?: string;
	debug?: boolean;
}

function isUrl(input: string): boolean {
	return input.startsWith("http://") || input.startsWith("https://");
}

function urlToOutputDir(url: string): string {
	const parsed = new URL(url);
	return join("liffy", parsed.host);
}

function maybeFlattenOutputPaths(pages: Page[]): {
	pages: Page[];
	flattenedRoot?: string;
} {
	let rootDir: string | null = null;
	for (const page of pages) {
		const parts = page.outputPath.split("/").filter(Boolean);
		if (parts.length < 2) {
			return { pages };
		}
		const top = parts[0];
		if (!top) {
			return { pages };
		}
		if (rootDir === null) {
			rootDir = top;
			continue;
		}
		if (rootDir !== top) {
			return { pages };
		}
	}

	if (!rootDir) {
		return { pages };
	}

	const flattenedPages = pages.map((page) => {
		const parts = page.outputPath.split("/").filter(Boolean);
		const newPath = parts.slice(1).join("/");
		return { ...page, outputPath: newPath };
	});

	const seen = new Set<string>();
	for (const page of flattenedPages) {
		if (seen.has(page.outputPath)) {
			return { pages };
		}
		seen.add(page.outputPath);
	}

	return { pages: flattenedPages, flattenedRoot: rootDir };
}

async function fetchContent(url: string): Promise<string> {
	console.log(`Fetching ${url}...`);

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	return response.text();
}

export async function splitCommand(options: SplitOptions): Promise<void> {
	const { input } = options;
	const inputIsUrl = isUrl(input);

	let content: string;
	let outputDir: string;

	if (inputIsUrl) {
		content = await fetchContent(input);
		outputDir = options.outputDir ?? urlToOutputDir(input);
	} else {
		const file = Bun.file(input);
		if (!(await file.exists())) {
			console.error(`Error: File not found: ${input}`);
			process.exit(1);
		}
		content = await file.text();
		outputDir = options.outputDir ?? ".";
	}
	const debug =
		options.debug === true
			? (message: string) => {
					console.log(`[debug] ${message}`);
				}
			: undefined;

	const result = split(content, debug);
	const adjusted =
		inputIsUrl === true
			? maybeFlattenOutputPaths(result.pages)
			: { pages: result.pages };

	if (adjusted.pages.length === 0) {
		const hint = options.debug ? "" : " (try --debug)";
		console.error(`Error: No pages found in input file${hint}`);
		process.exit(1);
	}

	console.log(`Detected format: ${result.pattern}`);
	console.log(`Found ${adjusted.pages.length} pages`);
	if (adjusted.flattenedRoot) {
		console.log(`Flattened: removed "${adjusted.flattenedRoot}/" prefix`);
	}

	// Write output files
	let written = 0;
	for (const page of adjusted.pages) {
		const outputPath = join(outputDir, page.outputPath);
		const dir = dirname(outputPath);

		await mkdir(dir, { recursive: true });
		await writeFile(outputPath, page.content, "utf-8");
		written++;
	}

	const indexContent = buildIndexJson(
		adjusted.pages.map((page) => page.outputPath),
		input,
		inputIsUrl ? new URL(input).host : undefined,
	);
	const indexPath = join(outputDir, "index.json");
	await writeFile(indexPath, indexContent, "utf-8");

	console.log(`Written ${written} files to ${outputDir}`);
	console.log(`Index: ${indexPath}`);
}

import { describe, expect, it } from "bun:test";
import { buildIndexJson } from "./index-json";

describe("buildIndexJson", () => {
	it("renders a nested index with source", () => {
		const result = buildIndexJson(
			["docs/guide.md", "docs/api/index.md", "index.md"],
			"https://example.com/llms-full.txt",
			"example.com",
		);
		const parsed = JSON.parse(result);

		expect(parsed).toEqual({
			name: "example.com",
			source: "https://example.com/llms-full.txt",
			tree: [
				{
					name: "docs",
					type: "directory",
					children: [
						{
							name: "api",
							type: "directory",
							children: [
								{
									name: "index.md",
									type: "file",
									path: "docs/api/index.md",
								},
							],
						},
						{
							name: "guide.md",
							type: "file",
							path: "docs/guide.md",
						},
					],
				},
				{
					name: "index.md",
					type: "file",
					path: "index.md",
				},
			],
		});
	});
});

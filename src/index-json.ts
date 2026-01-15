type TreeNode = {
	name: string;
	children: Map<string, TreeNode>;
	isFile: boolean;
};

type IndexNode = {
	name: string;
	type: "directory" | "file";
	path?: string;
	children?: IndexNode[];
};

function buildPathTree(paths: string[]): TreeNode {
	const root: TreeNode = { name: "", children: new Map(), isFile: false };

	for (const rawPath of paths) {
		const normalized = rawPath.replace(/\\/g, "/").trim();
		if (!normalized) continue;
		const parts = normalized.split("/").filter(Boolean);
		if (parts.length === 0) continue;

		let current = root;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (!part) continue;
			const isFile = i === parts.length - 1;
			const existing = current.children.get(part);

			if (existing) {
				if (isFile) {
					existing.isFile = true;
				}
				current = existing;
				continue;
			}

			const node: TreeNode = { name: part, children: new Map(), isFile };
			current.children.set(part, node);
			current = node;
		}
	}

	return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
	return Array.from(node.children.values()).sort((a, b) => {
		if (a.isFile !== b.isFile) {
			return a.isFile ? 1 : -1;
		}
		return a.name.localeCompare(b.name, "en");
	});
}

function buildIndexNodes(node: TreeNode, parentPath: string): IndexNode[] {
	const nodes: IndexNode[] = [];

	for (const child of sortedChildren(node)) {
		const childPath = parentPath ? `${parentPath}/${child.name}` : child.name;

		if (child.isFile) {
			nodes.push({ name: child.name, type: "file", path: childPath });
		} else {
			nodes.push({
				name: child.name,
				type: "directory",
				children: buildIndexNodes(child, childPath),
			});
		}
	}

	return nodes;
}

export function buildIndexJson(
	paths: string[],
	source?: string,
	name?: string,
): string {
	const uniquePaths = Array.from(
		new Set(
			paths.map((path) => path.replace(/\\/g, "/").trim()).filter(Boolean),
		),
	);
	const tree = buildIndexNodes(buildPathTree(uniquePaths), "");

	const index: {
		name?: string;
		source?: string;
		tree: IndexNode[];
	} = { tree };

	if (name) {
		index.name = name;
	}
	if (source) {
		index.source = source;
	}

	return `${JSON.stringify(index, null, 2)}\n`;
}

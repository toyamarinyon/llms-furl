/**
 * llms-full.txt splitter
 * Splits monolithic llms-full.txt into individual markdown files
 */

export type FormatPattern = "pattern-a" | "pattern-b" | "pattern-c" | "pattern-d";

export interface Page {
  title: string;
  url: string;
  content: string;
  outputPath: string;
}

export interface SplitResult {
  pattern: FormatPattern;
  pages: Page[];
}

const DASH_LINE = "--------------------------------------------------------------------------------";

/**
 * Detect the format pattern from file content
 */
export function detectPattern(content: string): FormatPattern {
  // Pattern B: <page> tags
  if (content.includes("<page>")) {
    return "pattern-b";
  }

  // Pattern D: dash separators (vercel format)
  if (content.startsWith(DASH_LINE)) {
    return "pattern-d";
  }

  // Check first few lines to distinguish Pattern A vs C
  const lines = content.split("\n").slice(0, 100);

  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (line.startsWith("# ")) {
      const nextLine = lines[i + 1];
      const lineAfter = lines[i + 2];

      // Pattern A: # Title followed immediately by Source:
      if (nextLine?.startsWith("Source: ")) {
        return "pattern-a";
      }

      // Pattern C: # Title + empty line + URL:
      if (nextLine?.trim() === "" && lineAfter?.startsWith("URL: ")) {
        return "pattern-c";
      }
    }
  }

  // Default to pattern-a
  return "pattern-a";
}

/**
 * Extract output path from URL
 * Example: https://axiom.co/docs/ai-engineering/concepts → docs/ai-engineering/concepts.md
 */
export function urlToOutputPath(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;

    // Remove leading slash
    path = path.replace(/^\//, "");

    // Remove trailing slash
    path = path.replace(/\/$/, "");

    // Handle index pages
    if (path === "" || path === "/") {
      path = "index";
    }

    // Remove .md or .html extension if present
    path = path.replace(/\.(md|html)$/, "");

    return `${path}.md`;
  } catch {
    // Fallback: use URL as-is with sanitization
    return url.replace(/[^a-zA-Z0-9-_/]/g, "_") + ".md";
  }
}

/**
 * Check if a line index is inside a code block
 */
function isInsideCodeBlock(lines: string[], lineIndex: number): boolean {
  let inCodeBlock = false;

  for (let i = 0; i < lineIndex; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    }
  }

  return inCodeBlock;
}

/**
 * Split content using Pattern A/D: # Title + Source:
 */
function splitPatternA(content: string): Page[] {
  const lines = content.split("\n");
  const pages: Page[] = [];
  let currentPage: { title: string; url: string; startLine: number } | null =
    null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const nextLine = lines[i + 1];

    // Check for page boundary: # Title followed by Source:
    if (
      line.startsWith("# ") &&
      nextLine?.startsWith("Source: ") &&
      !isInsideCodeBlock(lines, i)
    ) {
      // Save previous page
      if (currentPage !== null) {
        const pageContent = lines
          .slice(currentPage.startLine, i)
          .join("\n")
          .trim();
        pages.push({
          title: currentPage.title,
          url: currentPage.url,
          content: pageContent,
          outputPath: urlToOutputPath(currentPage.url),
        });
      }

      // Start new page
      currentPage = {
        title: line.slice(2).trim(),
        url: nextLine.slice(8).trim(),
        startLine: i,
      };
    }
  }

  // Save last page
  if (currentPage !== null) {
    const pageContent = lines.slice(currentPage.startLine).join("\n").trim();
    pages.push({
      title: currentPage.title,
      url: currentPage.url,
      content: pageContent,
      outputPath: urlToOutputPath(currentPage.url),
    });
  }

  return pages;
}

/**
 * Split content using Pattern B: <page>...</page> tags
 */
function splitPatternB(content: string): Page[] {
  const pages: Page[] = [];
  const pageRegex = /<page>([\s\S]*?)<\/page>/g;
  let match;

  while ((match = pageRegex.exec(content)) !== null) {
    const matchedContent = match[1];
    if (matchedContent === undefined) continue;
    const pageContent = matchedContent.trim();

    // Parse frontmatter
    const frontmatterMatch = pageContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const bodyRaw = frontmatterMatch[2];
      if (frontmatter === undefined || bodyRaw === undefined) continue;
      const body = bodyRaw.trim();

      // Extract title
      const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
      const title = titleMatch?.[1]?.trim() ?? "Untitled";

      // Extract source URL (html or md)
      let url = "";
      const htmlUrlMatch = frontmatter.match(/^\s*html:\s*(.+)$/m);
      const mdUrlMatch = frontmatter.match(/^\s*md:\s*(.+)$/m);

      if (htmlUrlMatch?.[1]) {
        url = htmlUrlMatch[1].trim();
      } else if (mdUrlMatch?.[1]) {
        url = mdUrlMatch[1].trim();
      }

      if (url) {
        pages.push({
          title,
          url,
          content: `---\n${frontmatter}\n---\n\n${body}`,
          outputPath: urlToOutputPath(url),
        });
      }
    }
  }

  return pages;
}

/**
 * Split content using Pattern C: # Title + empty line + URL:
 */
function splitPatternC(content: string): Page[] {
  const lines = content.split("\n");
  const pages: Page[] = [];
  let currentPage: { title: string; url: string; startLine: number } | null =
    null;

  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const nextLine = lines[i + 1];
    const lineAfter = lines[i + 2];

    // Check for page boundary: # Title + empty line + URL:
    if (
      line.startsWith("# ") &&
      nextLine?.trim() === "" &&
      lineAfter?.startsWith("URL: ") &&
      !isInsideCodeBlock(lines, i)
    ) {
      // Save previous page
      if (currentPage !== null) {
        const pageContent = lines
          .slice(currentPage.startLine, i)
          .join("\n")
          .trim();
        pages.push({
          title: currentPage.title,
          url: currentPage.url,
          content: pageContent,
          outputPath: urlToOutputPath(currentPage.url),
        });
      }

      // Start new page
      currentPage = {
        title: line.slice(2).trim(),
        url: lineAfter.slice(5).trim(),
        startLine: i,
      };
    }
  }

  // Save last page
  if (currentPage !== null) {
    const pageContent = lines.slice(currentPage.startLine).join("\n").trim();
    pages.push({
      title: currentPage.title,
      url: currentPage.url,
      content: pageContent,
      outputPath: urlToOutputPath(currentPage.url),
    });
  }

  return pages;
}

/**
 * Split content using Pattern D: dash separators (vercel format)
 * Each section starts with a line of dashes, followed by metadata, another line of dashes, then content
 */
function splitPatternD(content: string): Page[] {
  const pages: Page[] = [];
  const lines = content.split("\n");
  
  // Find all dash line indices
  const dashIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === DASH_LINE) {
      dashIndices.push(i);
    }
  }

  // Process pairs: (metadata start, metadata end) -> content until next metadata start
  for (let p = 0; p < dashIndices.length - 1; p += 2) {
    const metaStart = dashIndices[p];
    const metaEnd = dashIndices[p + 1];
    const nextMetaStart = dashIndices[p + 2];
    
    if (metaStart === undefined || metaEnd === undefined) continue;

    // Parse metadata between metaStart and metaEnd
    let title = "";
    let url = "";
    
    for (let i = metaStart + 1; i < metaEnd; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      const trimmed = line.trim();
      
      const titleMatch = trimmed.match(/^title:\s*"?(.+?)"?$/);
      if (titleMatch?.[1]) {
        title = titleMatch[1];
      }

      const sourceMatch = trimmed.match(/^source:\s*"?(.+?)"?$/);
      if (sourceMatch?.[1]) {
        url = sourceMatch[1];
      }
    }

    // Content is from metaEnd+1 until nextMetaStart (or end of file)
    const contentEndIndex = nextMetaStart ?? lines.length;
    const pageContent = lines.slice(metaEnd + 1, contentEndIndex).join("\n").trim();

    if (title && url && pageContent) {
      pages.push({
        title,
        url,
        content: pageContent,
        outputPath: urlToOutputPath(url),
      });
    }
  }

  return pages;
}

/**
 * Split llms-full.txt content into pages
 */
export function split(content: string): SplitResult {
  const pattern = detectPattern(content);

  let pages: Page[];

  switch (pattern) {
    case "pattern-a":
      pages = splitPatternA(content);
      break;
    case "pattern-b":
      pages = splitPatternB(content);
      break;
    case "pattern-c":
      pages = splitPatternC(content);
      break;
    case "pattern-d":
      pages = splitPatternD(content);
      break;
  }

  return { pattern, pages };
}

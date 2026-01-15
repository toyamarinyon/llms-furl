# index.json generation

## Decision

After splitting, write an `index.json` file at the output root.

## Format

```json
{
  "name": "example.com",
  "source": "<input URL or file path>",
  "tree": [
    {
      "name": "docs",
      "type": "directory",
      "children": [
        {
          "name": "api",
          "type": "directory",
          "children": [
            { "name": "index.md", "type": "file", "path": "docs/api/index.md" }
          ]
        },
        { "name": "guide.md", "type": "file", "path": "docs/guide.md" }
      ]
    },
    { "name": "index.md", "type": "file", "path": "index.md" }
  ]
}
```

## Notes

Implemented in `src/index-json.ts`, called from `src/cli/commands/split.ts`.

# Flatten single top-level directory

## Decision

When all output paths are nested under a single top-level directory (and there are no files at the root), strip that top-level directory.

## Scope

- Applied for URL inputs after splitting
- Skipped if paths would collide after flattening

## Notes

Implemented in `src/cli/commands/split.ts`.

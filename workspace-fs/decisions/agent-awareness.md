# Agent awareness for liffy output

## Decision

- Do not generate a top-level `liffy/index.json`. Only per-domain
  `liffy/<domain>/index.json` is created.
- Always generate/update `liffy/AGENTS.md` as the entry point for liffy output.
  It explains what `liffy/` is, shows minimal usage examples, and lists domains
  by reading each `liffy/<domain>/index.json` (including optional `source`).
- Ensure root `AGENTS.md` contains a marker-wrapped liffy section pointing to
  `liffy/AGENTS.md`. If the file exists, update the marker section idempotently;
  if not, create a minimal `AGENTS.md` with the section.
- When output is inside `liffy/`, liffy can integrate with the repo on first
  run by offering to update these files (TTY only):
  - `.gitignore`: add `liffy/`
  - `tsconfig.json`: add `liffy` to `exclude` when a safe update is possible
  - `AGENTS.md`: add/update the liffy section
- If the user denies consent or the environment is non-interactive, do not edit
  repo files and print short hints instead.

## Notes

- Use marker-wrapped snippets (e.g. `<!-- liffy:start -->`) to keep `AGENTS.md`
  updates idempotent, following the opensrc approach.
- Persist integration consent in `liffy/.liffy.json` (`integration.consent` and
  `integration.applied`).
- `tsconfig.json` is only auto-edited if the `exclude` array can be updated
  safely; otherwise a manual update hint is shown.

# 0001 — Monorepo layout and internal package resolution

## Status

Accepted.

## Context

The product ships several libraries (schemas, currency metadata, core engine) plus future
applications (REST API, MCP server, CLI). They share types and must build, test, and lint
together with fast feedback.

## Decision

Use a pnpm workspace with Turborepo. Each library lives under `packages/` and exposes its
TypeScript source directly for development:

- `main`, `types`, and `exports` point at `src/index.ts` during development, so the test
  runner and type checker read source without a build step.
- `publishConfig` overrides those fields to the built `dist/` output for publishing.
- `tsup` builds each package to ESM with declaration files.

Type checking uses `tsc --noEmit` with bundler module resolution. Tests use Vitest, which
resolves workspace packages through their source entry points.

## Consequences

- No build is required before running tests or type checks, which keeps the loop fast.
- Published artifacts still resolve to compiled JavaScript and declarations.
- Module resolution is consistent across the type checker, the test runner, and the bundler.

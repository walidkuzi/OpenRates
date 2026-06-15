# Contributing

Thank you for your interest in contributing to OpenRates. We welcome contributions from
the community.

## Development setup

Requirements: Node.js 22 or newer and pnpm 10.

```bash
git clone https://github.com/openrates/openrates-agent.git
cd openrates-agent
pnpm install
```

## Running checks

Before submitting a pull request, ensure all checks pass:

```bash
pnpm run check
```

This runs type checking, linting, format verification, tests, and the build in one pass.

Individual commands:

```bash
pnpm run typecheck   # TypeScript type checking
pnpm run lint        # Biome linting
pnpm test            # Vitest tests
pnpm run build       # Build all packages
```

## Adding a provider

See `docs/adding-a-provider.md` for the full guide. Your adapter must implement the
`ExchangeRateProvider` contract and pass the reusable contract test suite.

## Pull request requirements

All pull requests must:

1. Pass `pnpm run check` with no errors.
2. Include tests for new behaviour.
3. Use a clear, imperative commit message.

## Commit message style

Write in the imperative mood with a short subject line under 50 characters:

```
Add Frankfurter adapter for official reference rates
Fix decimal rounding in confidence calculation
```

Avoid "Added support for...", "Fixes issue where...", and trailing periods.

If the change needs more context, add a blank line followed by a short paragraph explaining
why, not what.

## Code of conduct

This project follows the `CODE_OF_CONDUCT.md` in the repository root.

## License

By contributing, you agree your code will be released under the Apache-2.0 license.

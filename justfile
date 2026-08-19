_default:
    @just --list

# Unit + snapshot tests (bun). Via yarn, not `bun test` directly: the runner
# needs --conditions=development to resolve `#@/*` to src rather than dist, and
# bunfig.toml has no equivalent knob.
test:
    yarn test

# Update the committed snapshots
test-update:
    yarn test:update

# Type-check the TypeScript (src and test)
check-ts:
    yarn typecheck

# Lint + format check
lint:
    yarn lint

# Apply biome's fixes
format:
    yarn format

# Format everything treefmt owns (nix, shell, toml) — see treefmt.nix
fmt:
    treefmt

# Same formatters, check-only: fails if anything is unformatted
fmt-check:
    treefmt --ci

# Regenerate the docs from docs/**/*.tpl.md
docs:
    yarn docs

# All PR gates. NOT fmt-check: treefmt comes from the devenv shell, and the
# other gates run from a bare shell too — run `just fmt-check` inside
# `devenv shell`, or let the treefmt git hook cover it.
check: lint check-ts test

# Build the npm publish artifact
build:
    devenv build outputs.dist

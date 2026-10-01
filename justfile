_default:
    @just --list

# Unit + snapshot tests
test:
    bun test

# Update the committed snapshots
test-update:
    bun test --update-snapshots

# Type-check the TypeScript (src and test)
check-ts:
    yarn typecheck

# Lint + format check: biome lints through treefmt, so this is the check-only run
lint:
    treefmt --ci

# Format and apply lint fixes for everything treefmt owns, see treefmt.nix
fmt:
    treefmt

# Regenerate the docs from docs/**/*.tpl.md
docs:
    yarn docs

# All PR gates. `lint` needs treefmt, which the devenv shell provides.
check: lint check-ts test

# Build the npm publish artifact
build:
    devenv build outputs.dist

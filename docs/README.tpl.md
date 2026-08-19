# Grafana CDK

Grafana CDK constructs for defining dashboards as typesafe Infrastructure as
Code, IaC.

Write dashboards as TypeScript, synthesize them to the JSON models Grafana
imports, and let the type checker catch the mistakes the Grafana schema cannot —
malformed time markup, panels that run off the grid, query references that point
at nothing, and plugin options that belong to a different panel.

## Installation

```bash
$embed: ./snippets/install-package.sh$
```

## At a glance

```typescript
$embed: ./snippets/quickstart.ts$
```

## Documentation

The documentation follows [Diátaxis](https://diataxis.fr/): four kinds of page,
each answering a different kind of question.

### Tutorial — *learning*

- [Build your first dashboard](docs/tutorial.md) — start here. One end-to-end
  pass from an empty file to a JSON model you can import.

### How-to guides — *goals*

- [Lay out panels on the grid](docs/how-to/lay-out-panels.md)
- [Set time ranges](docs/how-to/set-time-ranges.md)
- [Add template variables](docs/how-to/add-template-variables.md)
- [Style fields with thresholds, mappings and overrides](docs/how-to/style-fields.md)
- [Transform panel data](docs/how-to/transform-data.md)
- [Add a data source this package does not ship](docs/how-to/add-a-data-source.md)

### Reference — *information*

- [API reference](docs/reference.md) — every construct, prop and helper.

### Explanation — *understanding*

- [Design notes](docs/explanation.md) — why the constructs are shaped the way
  they are, and what each piece of validation is protecting you from.

## Contributing

Install [Nix](https://nixos.org/download) and
[devenv](https://devenv.sh/getting-started/), then enter the development shell,

```bash
$embed: ./snippets/devenv.sh$
```

or simply `direnv allow` if you have direnv installed. The shell pins Node,
Yarn, Bun, `just` and `treefmt`. Yarn is the package manager (pnpm linker); Bun
is the script and test runner.

```bash
just check        # lint, typecheck, test
just test         # unit and snapshot tests
just test-update  # re-record the snapshots
just fmt          # treefmt: nix, shell, toml
just docs         # regenerate the docs from docs/**/*.tpl.md
```

Every code block in the documentation is a real file under `docs/snippets`,
expanded into the `.tpl.md` templates by `just docs` and type-checked by
`yarn typecheck`. Edit the snippet, not the rendered Markdown.

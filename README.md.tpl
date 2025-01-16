# Grafana CDK

Grafana CDK constructs for defining dashboards as typesafe Infrastructure as
Code, IaC.

## Installation

```bash
$embed: ./snippets/install-package.sh$
```

## Usage

Define your dashboards like the following as a Node.js script to emit JSON
models for all the defined dashboards.

```typescript
$embed: ./snippets/dashboard.ts$
```

## Contribution

Install Nix and enter the development shell,

```bash
$embed: ./snippets/devenv.sh$
```

or simply `direnv allow` if you have direnv installed.

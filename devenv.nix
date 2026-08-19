{pkgs, ...}: let
  nodejs = pkgs.nodejs_24;
  yarn = pkgs.yarn-berry.override {inherit nodejs;};
in {
  # Node is the runtime the published package targets; bun is the script and
  # test runner (`bun test` — see package.json) and yarn is the package manager,
  # resolving into node_modules with the pnpm linker (.yarnrc.yml).
  packages = [
    nodejs
    yarn
    pkgs.bun
    pkgs.just
  ];

  # `languages.javascript.enable` is what registers the yarn install task. With
  # only the `yarn` block set it never runs, so a shell can reach `yarn lint`
  # with no node_modules ("Couldn't find the node_modules state file").
  languages.javascript = {
    enable = true;
    package = nodejs;
    yarn = {
      enable = true;
      package = pkgs.yarn-berry;
      install.enable = true;
    };
  };

  scripts = {
    # Expands `$embed: <path>$` markers in every docs/**/*.tpl.md against
    # docs/snippets, so every documented code block is a file the type checker
    # actually sees. Wired to the docs git-hook below.
    #
    # `.cjs`: devenv writes the body to an extensionless file in the store,
    # which node loads as CommonJS regardless of this package's `type: module`.
    # Keeping the checked-in copy `.cjs` means `node docs/build.cjs` behaves the
    # same as the packaged script.
    docs = {
      exec = builtins.readFile ./docs/build.cjs;
      package = nodejs;
      binary = "node";
    };
    # The artifact is a store path, so it is read-only and npm cannot pack from
    # it in place; copy it out first.
    publish.exec = ''
      set -euo pipefail
      out=$(devenv build outputs.dist | ${pkgs.jq}/bin/jq -r '."outputs.dist"')
      tmp=$(mktemp -d)
      trap 'rm -rf "$tmp"' EXIT
      cp -R "$out"/. "$tmp"/
      chmod -R u+w "$tmp"
      (cd "$tmp" && npm publish --access public)
    '';
  };

  # `treefmt` on PATH in the shell. The formatter set lives in ./treefmt.nix and
  # is imported rather than restated, so shell and CI cannot drift apart.
  treefmt = {
    enable = true;
    config.imports = [./treefmt.nix];
  };

  git-hooks.hooks = {
    treefmt.enable = true;

    statix = {
      enable = true;
      pass_filenames = true;
      # https://github.com/oppiliappan/statix/issues/69
      entry = "bash -c 'echo \"$@\" | xargs -n1 ${pkgs.statix}/bin/statix check'";
    };

    # The checked-in script rather than the `docs` shell script: git hooks run
    # from a bare shell, where devenv's scripts are not on PATH. pre-commit runs
    # hooks from the repository root, which is what build.cjs resolves against.
    docs = {
      enable = true;
      name = "docs";
      entry = "${nodejs}/bin/node docs/build.cjs";
      files = "(docs/.*\\.tpl\\.md|docs/snippets/.*)";
      pass_filenames = false;
    };
  };

  # `devenv build outputs.dist` — the npm publish artifact (see the `publish`
  # script above). Kept here rather than in a flake so there is one entry point.
  outputs.dist = pkgs.callPackage ./nix/dist.nix {inherit nodejs;};

  # Lint/format for TypeScript is biome, pinned in package.json and run via
  # `yarn lint`. Deliberately NOT wired as a Nix git-hook or a treefmt formatter:
  # nixpkgs ships a newer biome major than the one pinned here, and the two
  # reject each other's config. Keep a single biome — the project-pinned one.
}

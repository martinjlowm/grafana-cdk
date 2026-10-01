{pkgs, ...}: {
  # No projectRootFile: devenv supplies the root, so there is no filename here to
  # go stale (it pointed at flake.nix until that was folded into devenv.nix).
  #
  # Markdown is deliberately not formatted: the .md files are generated from
  # docs/**/*.tpl.md by the `docs` script, so reformatting them here would fight
  # the docs git-hook.
  programs = {
    alejandra.enable = true; # .nix — the style devenv.nix already uses
    shfmt.enable = true; # docs/snippets/*.sh
    taplo.enable = true; # typos.toml

    # biome formats and lints the TypeScript and JSON. treefmt hands it this
    # configuration from the store with --config-path, so the settings exist
    # only here, and the module runs `biome check --write`, which is the lint
    # pass as well as the formatter. treefmt walks the git index and skips
    # ignored paths, so the config carries no `vcs` or `files` block.
    biome = {
      enable = true;
      settings = {
        assist.actions.source.organizeImports = "on";
        formatter = {
          enabled = true;
          indentStyle = "space";
          indentWidth = 2;
          lineWidth = 120;
        };
        linter = {
          enabled = true;
          rules = {
            recommended = true;
            complexity.useLiteralKeys = "off";
            style = {
              noNonNullAssertion = "off";
              useNamingConvention = "off";
            };
            suspicious.noExplicitAny = "warn";
          };
        };
        javascript.formatter = {
          quoteStyle = "single";
          trailingCommas = "all";
        };
      };
      # treefmt-nix maps biome versions it does not know to a 2.1.2 schema. The
      # schema in biome's own source tree always matches the binary that runs.
      validate.schema = "${pkgs.biome.src}/packages/@biomejs/biome/configuration_schema.json";
    };
  };

  settings = {
    formatter = {
      # `-ci` indents case branches; shfmt's default flattens them against the
      # `esac`.
      shfmt.options = ["-ci"];
      # Wider than taplo's default of 80.
      taplo.options = ["--option" "column_width=100"];
    };

    global.excludes = [
      # Generated or vendored: rewritten by their own tools, so reformatting them
      # produces spurious diffs on regeneration.
      "yarn.lock"
      "devenv.lock"
      ".yarn/**"
      "*.snap"
      # Inputs the tests read byte for byte.
      "test/fixtures/**"
      # Build output.
      "dist/**"
      "node_modules/**"
    ];
  };
}

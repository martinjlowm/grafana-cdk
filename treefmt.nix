{
  # No projectRootFile: devenv supplies the root, so there is no filename here to
  # go stale (it pointed at flake.nix until that was folded into devenv.nix).
  #
  # NOT enabled, for a specific reason rather than oversight:
  #
  # - biome: the TS lint/format source of truth is the version pinned in
  #   package.json and run by `yarn lint`. nixpkgs ships a newer biome major
  #   whose config the pinned one rejects (and vice versa) — see devenv.nix.
  # - prettier/dprint on Markdown: the .md files are generated from
  #   docs/**/*.tpl.md by the `docs` script, so reformatting them here would
  #   fight the docs git-hook.
  programs = {
    alejandra.enable = true; # .nix — the style devenv.nix already uses
    shfmt.enable = true; # docs/snippets/*.sh
    taplo.enable = true; # typos.toml
  };

  settings = {
    formatter = {
      # `-ci` indents case branches; shfmt's default flattens them against the
      # `esac`.
      shfmt.options = ["-ci"];
      # Match biome's lineWidth (biome.json) instead of taplo's 80.
      taplo.options = ["--option" "column_width=100"];
    };

    global.excludes = [
      # Generated or vendored: rewritten by their own tools, so reformatting them
      # produces spurious diffs on regeneration.
      "yarn.lock"
      "devenv.lock"
      ".yarn/**"
      "*.snap"
      # Build output.
      "dist/**"
      "node_modules/**"
    ];
  };
}

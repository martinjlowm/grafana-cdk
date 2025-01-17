{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    devenv,
    ...
  } @ inputs: let
    system = builtins.currentSystem;
    pkgs = nixpkgs.legacyPackages.${system};
    nodejs = pkgs.nodejs_23;
  in {
    devShell.${system} = devenv.lib.mkShell {
      inherit inputs pkgs;
      modules = [
        {
          packages = [
            nodejs
            (pkgs.yarn-berry.override {inherit nodejs;})
          ];

          scripts = {
            publish.exec = ''
              nix build .#dist --impure -L
              (cd result; npm publish --access public)
            '';
            snippets = {
              exec = ''
                const fs = require('node:fs');
                const path = require('node:path');

                const [,, filename] = process.argv;
                const sourcePath = path.resolve('.', path.dirname(filename));
                const contents = fs.readFileSync(filename).toString();

                process.stdout.write(
                  contents.replace(/\$embed: (.+)\$/g, (_, snippet) => {
                    return fs.readFileSync(path.resolve(sourcePath, snippet)).toString().trim();
                  })
                );
              '';
              package = nodejs;
              binary = "node";
            };
          };

          git-hooks.hooks = {
            alejandra.enable = true;
            statix = {
              enable = true;
              pass_filenames = true;
              # https://github.com/oppiliappan/statix/issues/69
              entry = "bash -c 'echo \"$@\" | xargs -n1 ${pkgs.statix}/bin/statix check'";
            };
            biome = {
              package = pkgs.biome;
              enable = true;
              entry = "${pkgs.biome}/bin/biome check --write --no-errors-on-unmatched --diagnostic-level=error --verbose";
            };
            typos = {
              enable = true;
              entry = "${pkgs.typos}/bin/typos --force-exclude --exclude .git/*";
            };
            readme = {
              enable = true;
              name = "README.md";
              entry = ''bash -c "snippets docs/README.tpl.md > README.md"'';
              files = "(docs\/README.md.tpl|docs\/snippets\/.*)";
            };
          };
        }
      ];
    };

    dist = import ./nix/dist.nix pkgs;
  };
}

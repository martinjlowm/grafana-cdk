{
  cacert,
  jq,
  lib,
  nodejs,
  stdenvNoCC,
  yarn-berry,
  ...
}: let
  inherit (builtins.fromJSON (builtins.readFile ../package.json)) version;
  # yarn-berry, not nodePackages.yarn: the project is Yarn 4 (.yarnrc.yml pins
  # .yarn/releases and nodeLinker: pnpm), which Yarn 1 refuses to read.
  yarn = "${yarn-berry.override {inherit nodejs;}}/bin/yarn";
  _jq = "${jq}/bin/jq";
in
  stdenvNoCC.mkDerivation {
    name = "grafana-cdk-${version}";

    src = lib.fileset.toSource {
      root = ../.;
      fileset = lib.fileset.unions [
        ../src
        ../docs
        ../package.json
        ../.npmrc
        ../tsconfig.json
        ../yarn.lock
        ../.yarnrc.yml
        ../.yarn/releases
        ../README.md
      ];
    };

    buildInputs = [cacert nodejs];

    dontStrip = true;

    configurePhase = ''
      export HOME="$TMP";
      export YARN_GLOBAL_FOLDER="$TMP/.yarn/berry";
      export YARN_ENABLE_GLOBAL_CACHE=0;
      mkdir -p .yarn/cache
    '';

    # `yarn install` needs the network, so this is built with --impure /
    # sandbox off — see the `publish` script in devenv.nix.
    buildPhase = ''
      ${yarn} install --immutable
      ${yarn} build
    '';

    # The published package resolves `#@/*` against ./dist, whereas the checkout
    # resolves it against ./src through the `development` condition. Rewrite the
    # imports map rather than shipping a second package.json that can drift, and
    # drop `workspaces` (docs/snippets is not published).
    installPhase = ''
      mkdir -p $out

      ${_jq} '.imports = {"#@/*.ts": ["./dist/*.js"], "#@/*": ["./dist/*.js", "./dist/*"]}
              | .exports = {".": {"types": "./dist/index.d.ts", "default": "./dist/index.js"},
                            "./*": {"types": "./dist/*.d.ts", "default": "./dist/*.js"}}
              | del(.workspaces)
              | del(.devDependencies)
              | del(.scripts)' package.json > $out/package.json
      mv dist $out/
      mv README.md $out/
      mv .npmrc $out/
    '';

    meta = {
      homepage = "https://github.com/martinjlowm/grafana-cdk";
      description = "Grafana CDK constructs for defining dashboards as typesafe Infrastructure as Code, IaC.";
      platforms = lib.platforms.linux ++ lib.platforms.darwin;
      license = lib.licenses.mit;
    };
  }

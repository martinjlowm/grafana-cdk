{
  cacert,
  jq,
  lib,
  nodePackages,
  stdenvNoCC,
  ...
}: let
  inherit (builtins.fromJSON (builtins.readFile ../package.json)) version;
  yarn = "${nodePackages.yarn}/bin/yarn";
  _jq = "${jq}/bin/jq";
in
  stdenvNoCC.mkDerivation {
    name = "drata-cdk-stackset-${version}";

    src = lib.fileset.toSource {
      root = ../.;
      fileset = lib.fileset.unions [
        ../src
        ../package.json
        ../tsconfig.json
        ../yarn.lock
        ../.yarnrc.yml
        ../.yarn/releases
        ../.yarn/sdks
        ../.pnp.cjs
        ../.pnp.loader.mjs
        ../.npmrc
        ../README.md
      ];
    };

    buildInputs = [cacert];

    dontStrip = true;

    configurePhase = ''
      export HOME="$TMP";
      export yarn_global_folder="$TMP";
      mkdir -p .yarn/cache
    '';

    buildPhase = ''
      ${yarn} install --immutable
      ${yarn} tsc
    '';

    installPhase = ''
      mkdir -p $out

      ${_jq} '.imports."#@/*" |= ["./dist/*", "./dist/*.js"]' package.json > $out/package.json
      mv dist $out/
      mv README.md $out/
      mv .npmrc $out/
    '';

    meta = with lib; {
      homepage = "https://github.com/FactbirdHQ/drata-cdk-stackset";
      description = "A CDK construct derived from Drata's official template at https://github.com/drata/aws-cloudformation-drata-setup";
      platforms = platforms.linux ++ platforms.darwin;
    };
  }

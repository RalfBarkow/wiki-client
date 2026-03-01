{
  description = "wiki-client dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.git
            pkgs.jq
          ];

          shellHook = ''
            export NODE_OPTIONS="''${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-require-module"
            export PATH="$PWD/node_modules/.bin:$PATH"

            echo
            echo "wiki-client devShell"
            echo
            echo "Common commands:"
            echo "  • npm test"
            echo "  • npm run build"
            echo "  • npm run pw:test"
            echo
          '';
        };
      });
}

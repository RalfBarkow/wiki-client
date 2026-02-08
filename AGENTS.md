# AGENTS.md

## Purpose
This repository is undergoing intentional simplification.
Primary objective: remove jQuery as a core dependency, in line with the FedWiki direction “simpler is our new direction”.

All automated or assisted changes must reduce legacy surface area or make such reduction easier.

## Scope Order (Mandatory)
Changes must follow this order unless explicitly overridden:

1. Tests and test harnesses
   - Remove jQuery from tests first.
   - Tests must not require jQuery, jQuery UI, or jQuery Migrate.

2. Build and tooling
   - Prefer ESM, esbuild, and native browser APIs.
   - Vendored libraries are considered technical debt.

3. Runtime client code
   - Isolate jQuery usage behind minimal adapters.
   - No new direct `$` or `jQuery` usage is permitted.

## Hard Rules
- Do NOT introduce new dependencies on jQuery, jQuery UI, jQuery Migrate, or underscore.
- Do NOT expand vendored libraries under client/js/.
- Do NOT refactor plugin APIs unless required for simplification.
- Prefer deletion over abstraction where safe.
- Prefer browser-native APIs over polyfills.

## Measurement
Progress must be observable. Use at least one of:
- Reduction in files containing `$(` or `jQuery`.
- Reduction in boxed nodes produced by scripts/requires-graph.pl.
- Removal of jquery-migrate from any HTML entry point.

## Compatibility Strategy
Short-term compatibility is maintained by:
- Adapters or shims at module boundaries.
- Incremental removal, not flag days.

Long-term goal:
- jQuery is optional or absent at runtime.

## Commit Discipline
- One logical change per commit.
- Conventional Commits, plain text only.
- Example:
  refactor(test): remove jQuery dependency from testclient

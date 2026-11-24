# Upstream

- Source: https://github.com/dmmulroy/anti-slop
- Commit: 13909c9e07590f5a85d93c62712259fe14a883f7 (2026-10-18), package version 0.1.2
- Copied from: `skills/install-anti-slop/assets/anti-slop/` (identical to upstream `src/` without its `*.test.ts` files)
- Installed at: `tools/oxlint/anti-slop/`, registered as `anti-slop` in `.oxlintrc.json`
- Not registered: the Effect plugin (`effect/`); this repo doesn't depend on `effect`
- Deviations: doc comments that only restated a function's name or signature are removed (comment audit); no behaviour changed

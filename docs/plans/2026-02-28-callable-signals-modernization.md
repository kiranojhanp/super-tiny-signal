# Callable Signals Modernization Plan

Goal: modernize syntax and improve DX while keeping `super-tiny-signal` very small.

## Chosen direction

- Adopt callable signals as primary API: `count()` to read and `count(next)` to write.
- Keep temporary `.value` compatibility for one beta cycle.
- Add tiny DOM helpers (`bindText`, `bindAttr`, `on`) with auto-cleanup for removed nodes.

## Execution batches

1. Add callable API tests and preserve existing `.value` behavior.
2. Refactor core `signal`/`computed` factories to return callable wrappers.
3. Add DOM binding helpers with node-scoped cleanup and typed events.
4. Update exports, hooks, docs, and migration examples.
5. Run `bun test` and `npm run build` to verify.

# docs

This folder explains how Super Tiny Signal works under the hood.

If you are new to the project, read in this order:

1. `reactivity.md`
2. `store-and-persistence.md`

## architecture at a glance

```mermaid
flowchart LR
  U[User code] --> S[signal value read/write]
  S --> C[computed values]
  S --> E[effect registration and reruns]
  C --> E
  E --> R[side effects: UI/log/network]

  U --> ST[createStore]
  ST --> SIG[state fields wrapped in Signal]
  ST --> SUB[subscribe listeners]

  ST --> P[persist middleware]
  P --> SA[storage adapter]
  SA --> LS[localStorage JSON]
  SA --> IDB[IndexedDB]
```

## files

- `reactivity.md`: signals, computed values, effect tracking, batching, and scheduling
- `store-and-persistence.md`: `createStore`, subscriptions, `persist`, and storage adapters

## quick mental model

- A `signal` stores a value and knows which effects depend on it.
- An `effect` runs immediately, tracks dependencies while running, then reruns when those dependencies change.
- A `computed` is a read-only signal that derives from other signals and updates lazily (or eagerly when configured).
- A store is plain state plus actions, where non-function state fields are internally signal-backed.
- Persistence wraps store updates so state is loaded on startup and saved after writes.

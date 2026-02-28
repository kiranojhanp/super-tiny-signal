# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 💥 Breaking API Revision

#### Tuple Signal API + Derived Getter API
**Changed**: `signal()` now returns `[getter, setter]` instead of a mutable `Signal<T>` instance as the primary public API.

**Details**:
- `const [count, setCount] = signal(0)`
- Read with `count()`
- Write with `setCount(next)` or `setCount(prev => next)`
- New `derived(() => ...)` helper returns a callable getter for derived values

**Why**: This removes call-site ambiguity and keeps read/write intent explicit without dual-purpose call signatures.

**Files Changed**: `src/core/signal.ts`, `src/core/computed.ts`, `src/hooks/useState.ts`, `src/hooks/useMemo.ts`, `src/types/index.ts`, tests

### 🐛 Critical Bug Fixes

#### Computed Signals Not Recomputing
**Fixed**: Computed signals now properly recompute when dependencies change, even in deeply nested chains.

**Root Cause**: The `markDirty` callback was being scheduled asynchronously through the effect system, causing computed signals to return stale values when accessed immediately after a dependency changed.

**Solution**: Implemented synchronous dirty flag propagation by:
- Marking computed signals' `markDirtyEffect` with a `sync` flag
- Calling sync effects synchronously in signal setter, before scheduling async effects
- Propagating sync effects through computed chains to ensure all dirty flags are set immediately

**Impact**: This enables computed signals to work correctly in all scenarios, including:
- Simple computed values (e.g., `doubled = computed(() => count() * 2)`)
- Chained computed signals (e.g., `quadrupled = computed(() => doubled.value * 2)`)
- Complex dependency graphs with multiple levels of derivation

**Files Changed**: `src/core/signal.ts`, `src/core/computed.ts`

#### Memory Leak in Computed Signal Dependencies
**Fixed**: Computed signals now properly clean up old dependencies when recomputing.

**Root Cause**: When a computed signal's dependencies changed (e.g., conditional logic switching which signals are read), the old dependencies were not being unsubscribed, causing memory leaks and incorrect reactivity.

**Solution**: Added proper dependency cleanup in `Computed.recompute()`:
- Track all dependency signals in a `sources` Set
- Before recomputation, remove the `markDirtyEffect` from all old dependencies
- After recomputation, update the `sources` Set with new dependencies

**Files Changed**: `src/core/computed.ts`

#### useEffect Memory Leak
**Fixed**: `useEffect` now returns a disposal function instead of `undefined`.

**Root Cause**: The hook was not returning the disposal function from the underlying `effect()` call, preventing cleanup and causing memory leaks.

**Solution**: Changed `useEffect` to return the disposal function directly.

**Breaking Change**: ⚠️ Applications relying on the (incorrect) `undefined` return value may need updates, though proper usage already expected a disposal function.

**Files Changed**: `src/hooks/useEffect.ts`

#### useMemo Returning Undefined
**Fixed**: `useMemo` now returns a callable getter (`() => T`) via `derived`, preserving reactivity and matching tuple-style ergonomics.

**Root Cause**: Previous implementations alternated between returning raw values and computed wrappers, causing inconsistent behavior and API mismatch.

**Solution**: Changed `useMemo` to return `derived(fn, options)` directly, so consumers use `memo()` consistently.

**Breaking Change**: ⚠️ Code using `useMemo` must call the returned getter function (`memo()`) instead of reading `.value`.

**Files Changed**: `src/hooks/useMemo.ts`

#### Persist Middleware Race Condition
**Fixed**: State persistence now handles race conditions between hydration and setState calls.

**Root Cause**: If `setState` was called while the storage adapter was still loading persisted state, the updates could be lost or overwritten.

**Solution**: Implemented hydration tracking and queueing:
- Track hydration status with `isHydrated` flag
- Queue any `setState` calls that occur during hydration
- Apply queued updates after hydration completes
- Added `onHydrated` callback for applications to know when state is ready

**Files Changed**: `src/persist/persist.ts`, `src/types/index.ts`

#### IndexedDB Storage Type Mismatch
**Fixed**: Removed incorrect `.toString()` call and added version parameter support.

**Root Cause**: The adapter was calling `.toString()` on stored values, corrupting JSON strings. Also lacked version parameter for schema migrations.

**Solution**:
- Store values as-is (persist middleware already stringifies to JSON)
- Added `version` parameter to `createIndexedDBStorage` for database versioning

**Files Changed**: `src/persist/indexedDBStorage.ts`

### 🔧 Code Quality Improvements

#### Standardized ESM Imports
**Fixed**: All imports now use `.js` extensions for proper ESM compliance.

**Rationale**: TypeScript doesn't rewrite import paths, so even though source files are `.ts`, imports must reference the compiled `.js` extensions for runtime compatibility.

**Files Changed**: All source files

#### Infinite Loop Protection in Effects
**Added**: Effect flushing now detects and prevents infinite loops with a maximum iteration limit.

**Details**: If effects keep scheduling themselves beyond `MAX_FLUSH_ITERATIONS` (default: 100), an error is thrown to prevent application hangs.

**Files Changed**: `src/core/effect.ts`

#### Input Validation for Store Property Names
**Added**: `createStore` now validates that property names don't conflict with reserved methods.

**Details**: Throws an error if initialState contains properties named `getState`, `setState`, or `subscribe`.

**Files Changed**: `src/store/createStore.ts`

#### Consolidated Equality Functions
**Fixed**: Removed duplicate `defaultEquals` definitions.

**Details**: Now uses a single `defaultEquals` function exported from `src/utils/equality.ts`.

**Files Changed**: `src/core/signal.ts`, `src/core/computed.ts`, `src/utils/equality.ts`

#### Removed All `any` Types
**Improved**: Replaced all `any` types with proper TypeScript types (`unknown`, `T`, etc.) for better type safety.

**Details**:
- `Signal<any>` → `Signal<unknown>`
- `Record<string, any>` → `Record<string, unknown>`
- `StorageAdapter.getItem(): Promise<any>` → `Promise<unknown>`
- `deepEqual(a: any, b: any)` → `deepEqual(a: unknown, b: unknown)`
- `EqualsFn<any>` → `EqualsFn<unknown>`

**Files Changed**: `src/types/index.ts`, `src/utils/equality.ts`, `src/persist/*.ts`, `src/store/createStore.ts`

#### Fixed Store Subscription Notifications
**Fixed**: Store subscribers are now properly notified when any signal property changes.

**Details**: Added effect watchers for each signal property that trigger subscriber notifications, with guards to skip initial effect runs.

**Files Changed**: `src/store/createStore.ts`

#### Fixed flushEffects Return Type
**Improved**: `flushEffects()` now returns `Promise<void>` for proper async handling.

**Details**: Wrapped effect flushing in `Promise.resolve().then()` to ensure consistent async behavior.

**Files Changed**: `src/core/effect.ts`

### ✅ Testing

#### Added Comprehensive Test Suite
**Added**: 49 tests covering all core functionality using Bun test runner.

**Test Coverage**:
- **Signal Tests** (8 tests): Creation, updates, subscriptions, equality checks
- **Computed Tests** (10 tests): Lazy/eager modes, dependency tracking, chained computed signals
- **Effect Tests** (9 tests): Execution, cleanup, batching, infinite loop protection
- **Hook Tests** (11 tests): useState, useEffect (with cleanup), useMemo
- **Store Tests** (11 tests): State management, subscriptions, reserved property validation

**Files Added**: `tests/core/*.test.ts`, `tests/hooks/*.test.ts`, `tests/store/*.test.ts`

**Package Changes**: Added `@types/bun`, test scripts (`test`, `test:watch`)

### 📝 Documentation

#### Improved Type Definitions
**Enhanced**: Added comprehensive JSDoc comments and better type constraints throughout the codebase.

**Files Changed**: Multiple source files

### 🔄 Migration Guide

#### Breaking Changes

1. **useEffect Return Value**
   ```typescript
   // Before (incorrect)
   useEffect(() => { ... }); // returned undefined

   // After (correct)
   const dispose = useEffect(() => { ... });
   dispose(); // Properly cleanup
   ```

2. **useMemo Return Type**
   ```typescript
   // Before
   const doubled = useMemo(() => count() * 2);
   console.log(doubled.value);

   // After
   const doubled = useMemo(() => count() * 2);
   console.log(doubled()); // Returns current memoized value
   ```

3. **Signal Read/Write Syntax**
   ```typescript
   // Before
   const count = signal(0);
   count.value = 5;
   console.log(count.value);

   // After
   const [count, setCount] = signal(0);
   setCount(5);
   console.log(count());
   ```

4. **Persist Middleware**
   - If relying on synchronous hydration, use the new `onHydrated` callback:
   ```typescript
   persist(store, {
     name: 'my-store',
     storage: jsonStorage,
     onHydrated: (state) => {
       console.log('State loaded:', state);
       // Safe to use state here
     }
   });
   ```

5. **IndexedDB Version Support**
   ```typescript
   // Before
   const storage = createIndexedDBStorage('myDB', 'myStore');

   // After (with optional version)
   const storage = createIndexedDBStorage('myDB', 'myStore', 1);
   ```

### 🎯 Next Steps

- [ ] Add persistence tests
- [ ] Add API documentation
- [ ] Consider adding migration utilities for breaking changes
- [ ] Performance benchmarks

---

## [Previous Versions]

See git history for changes prior to this comprehensive refactoring.

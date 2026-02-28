// Exporting core-related utilities and classes
export { Signal, signal } from "./core/signal";
export { Computed, computed } from "./core/computed";
export { effect, batch } from "./core/effect";
export { bindText } from "./dom/bindText";
export { bindAttr } from "./dom/bindAttr";
export { on } from "./dom/on";

// Exporting store-related functionality
export { createStore } from "./store/createStore";

// Exporting middleware and storage utilities (from persist)
export { persist } from "./persist/persist";
export { createJSONStorage } from "./persist/jsonStorage";
export { createIndexedDBStorage } from "./persist/indexedDBStorage";

// Exporting hooks
export { useEffect } from "./hooks/useEffect";
export { useMemo } from "./hooks/useMemo";
export { useState } from "./hooks/useState";

// Exporting utility functions
export { deepEqual } from "./utils/equality";

// Export types
export type { Store } from "./types";
export type { WritableSignal, SignalValue } from "./core/signal";
export type { ComputedSignal } from "./core/computed";

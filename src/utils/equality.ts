import type { EqualsFn } from "../types/index.js";

/**
 * Deep equality check for objects and arrays.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(bRecord, key) || !deepEqual(aRecord[key], bRecord[key])) return false;
  }
  return true;
}

export const defaultEquals: EqualsFn<unknown> = Object.is;

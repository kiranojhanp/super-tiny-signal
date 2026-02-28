import { describe, expect, test } from "bun:test";
import { computed } from "../../src/core/computed.js";
import { signal } from "../../src/core/signal.js";
import { effect } from "../../src/core/effect.js";

describe("Computed", () => {
  test("should compute initial value synchronously", () => {
    const count = signal(5);
    const doubled = computed(() => count.value * 2);
    
    expect(doubled.value).toBe(10);
  });

  test("should recompute when dependencies change (lazy)", () => {
    const count = signal(5);
    const doubled = computed(() => count.value * 2);
    
    // First access
    expect(doubled.value).toBe(10);
    
    // Change dependency - computed becomes dirty but doesn't recompute until accessed
    count.value = 10;
    
    // Access triggers recomputation
    expect(doubled.value).toBe(20);
  });

  test("should work with multiple dependencies", () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a.value + b.value);
    
    expect(sum.value).toBe(5);
    
    a.value = 10;
    expect(sum.value).toBe(13);
    
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  test("should notify effects when computed value changes", () => {
    const count = signal(5);
    const doubled = computed(() => count.value * 2);
    let effectRuns = 0;
    let lastValue = 0;
    
    effect(() => {
      lastValue = doubled.value;
      effectRuns++;
    });
    
    expect(effectRuns).toBe(1);
    expect(lastValue).toBe(10);
    
    count.value = 10;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(effectRuns).toBe(2);
        expect(lastValue).toBe(20);
        resolve(undefined);
      }, 10);
    });
  });

  test("should not recompute if dependencies don't change", () => {
    let computations = 0;
    const count = signal(5);
    const doubled = computed(() => {
      computations++;
      return count.value * 2;
    });
    
    // First access
    expect(doubled.value).toBe(10);
    expect(computations).toBe(1);
    
    // Second access without dependency change
    expect(doubled.value).toBe(10);
    expect(computations).toBe(1); // Should not recompute
    
    // Change dependency
    count.value = 10;
    expect(doubled.value).toBe(20);
    expect(computations).toBe(2);
  });

  test("should handle chained computed signals", () => {
    const count = signal(2);
    const doubled = computed(() => count.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    
    expect(quadrupled.value).toBe(8);
    
    count.value = 5;
    expect(quadrupled.value).toBe(20);
  });

  test("should support eager mode", () => {
    let computations = 0;
    const count = signal(5);
    const doubled = computed(() => {
      computations++;
      return count.value * 2;
    }, { eager: true });
    
    // Should compute immediately in eager mode
    expect(computations).toBe(1);
    expect(doubled.value).toBe(10);
    
    count.value = 10;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // In eager mode, should recompute immediately when dependency changes
        expect(computations).toBe(2);
        expect(doubled.value).toBe(20);
        resolve(undefined);
      }, 10);
    });
  });

  test("should throw error when trying to set computed value", () => {
    const count = signal(5);
    const doubled = computed(() => count.value * 2);
    
    expect(() => {
      (doubled as any).value = 100;
    }).toThrow("Cannot set value of a computed signal");
  });

  test("should handle complex dependency graphs", () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    
    const ab = computed(() => a.value + b.value);
    const bc = computed(() => b.value + c.value);
    const abc = computed(() => ab.value + bc.value);
    
    expect(abc.value).toBe(8); // (1+2) + (2+3) = 8
    
    a.value = 10;
    expect(abc.value).toBe(17); // (10+2) + (2+3) = 17
    
    b.value = 5;
    expect(abc.value).toBe(23); // (10+5) + (5+3) = 23
    
    c.value = 10;
    expect(abc.value).toBe(30); // (10+5) + (5+10) = 30
  });

  test("should only recompute once even with multiple dependencies changing", () => {
    let computations = 0;
    const a = signal(1);
    const b = signal(2);
    
    const sum = computed(() => {
      computations++;
      return a.value + b.value;
    });
    
    expect(sum.value).toBe(3);
    expect(computations).toBe(1);
    
    // Change both dependencies
    a.value = 10;
    b.value = 20;
    
    // Should only compute once when accessed
    expect(sum.value).toBe(30);
    expect(computations).toBe(2);
  });
});

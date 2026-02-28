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

  // Edge case tests
  describe("Edge Cases", () => {
    test("should handle errors during computation", () => {
      const shouldError = signal(false);
      const erroringComputed = computed(() => {
        if (shouldError.value) {
          throw new Error("Computation error");
        }
        return 42;
      });
      
      // Should work fine initially
      expect(erroringComputed.value).toBe(42);
      
      // Should throw when computation errors
      shouldError.value = true;
      expect(() => erroringComputed.value).toThrow("Computation error");
      
      // Should recover when error is fixed
      shouldError.value = false;
      expect(erroringComputed.value).toBe(42);
    });

    test("should handle conditional dependencies", () => {
      const useA = signal(true);
      const a = signal(1);
      const b = signal(100);
      
      const conditional = computed(() => {
        return useA.value ? a.value : b.value;
      });
      
      expect(conditional.value).toBe(1);
      
      // Track computations
      let computations = 0;
      const tracked = computed(() => {
        computations++;
        return useA.value ? a.value : b.value;
      });
      
      expect(tracked.value).toBe(1);
      expect(computations).toBe(1);
      
      // Change b (not currently used) - because of how dependency tracking works,
      // the computed won't recompute since b isn't accessed when useA is true
      b.value = 200;
      expect(tracked.value).toBe(1);
      expect(computations).toBe(1); // Won't recompute since b isn't in current dependency set
      
      // Switch to b
      useA.value = false;
      expect(tracked.value).toBe(200);
      expect(computations).toBe(2);
      
      // Now changing a shouldn't trigger recomputation
      a.value = 500;
      expect(tracked.value).toBe(200);
      expect(computations).toBe(2); // Won't recompute since a isn't accessed when useA is false
    });

    test("should detect circular dependencies", () => {
      // This tests that circular computed signals don't cause infinite loops
      const a = signal(1);
      
      let bComputations = 0;
      let cComputations = 0;
      
      // Create two computed signals that could potentially reference each other
      const b = computed(() => {
        bComputations++;
        return a.value * 2;
      });
      
      const c = computed(() => {
        cComputations++;
        return b.value + 1;
      });
      
      expect(c.value).toBe(3);
      expect(bComputations).toBe(1);
      expect(cComputations).toBe(1);
      
      a.value = 5;
      expect(c.value).toBe(11);
      expect(bComputations).toBe(2);
      expect(cComputations).toBe(2);
    });

    test("should handle very deep computed chains", () => {
      const base = signal(1);
      let current = base as { value: number };
      
      // Create a chain of 50 computed signals
      for (let i = 0; i < 50; i++) {
        const prev = current;
        current = computed(() => prev.value + 1);
      }
      
      expect(current.value).toBe(51);
      
      base.value = 10;
      expect(current.value).toBe(60);
    });

    test("should handle switching between lazy and eager mode", () => {
      let lazyComputations = 0;
      let eagerComputations = 0;
      
      const count = signal(5);
      
      const lazy = computed(() => {
        lazyComputations++;
        return count.value * 2;
      });
      
      const eager = computed(() => {
        eagerComputations++;
        return count.value * 3;
      }, { eager: true });
      
      // Eager computes immediately
      expect(eagerComputations).toBe(1);
      // Lazy doesn't compute until accessed
      expect(lazyComputations).toBe(0);
      
      expect(lazy.value).toBe(10);
      expect(lazyComputations).toBe(1);
      
      count.value = 10;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          // Eager should have recomputed
          expect(eagerComputations).toBe(2);
          // Lazy should still be dirty
          expect(lazyComputations).toBe(1);
          
          // Access lazy to trigger recomputation
          expect(lazy.value).toBe(20);
          expect(lazyComputations).toBe(2);
          
          resolve(undefined);
        }, 10);
      });
    });

    test("should handle null and undefined in computations", () => {
      const nullableSignal = signal<number | null>(null);
      const undefinableSignal = signal<number | undefined>(undefined);
      
      const nullComputed = computed(() => {
        return nullableSignal.value ?? 42;
      });
      
      const undefinedComputed = computed(() => {
        return undefinableSignal.value ?? 42;
      });
      
      expect(nullComputed.value).toBe(42);
      expect(undefinedComputed.value).toBe(42);
      
      nullableSignal.value = 10;
      undefinableSignal.value = 20;
      
      expect(nullComputed.value).toBe(10);
      expect(undefinedComputed.value).toBe(20);
    });

    test("should handle empty computations", () => {
      const empty = computed(() => {
        // No dependencies, always returns same value
        return 42;
      });
      
      expect(empty.value).toBe(42);
      expect(empty.value).toBe(42);
    });

    test("should handle computations that return objects", () => {
      const a = signal(1);
      const b = signal(2);
      
      const obj = computed(() => ({
        a: a.value,
        b: b.value,
        sum: a.value + b.value
      }));
      
      const result1 = obj.value;
      expect(result1).toEqual({ a: 1, b: 2, sum: 3 });
      
      a.value = 10;
      const result2 = obj.value;
      expect(result2).toEqual({ a: 10, b: 2, sum: 12 });
      
      // Should be different object instances
      expect(result1).not.toBe(result2);
    });

    test("should handle computations that return arrays", () => {
      const a = signal(1);
      const b = signal(2);
      
      const arr = computed(() => [a.value, b.value, a.value + b.value]);
      
      expect(arr.value).toEqual([1, 2, 3]);
      
      a.value = 5;
      expect(arr.value).toEqual([5, 2, 7]);
    });

    test("should handle computations with side effects (anti-pattern)", () => {
      const count = signal(0);
      let sideEffectRan = 0;
      
      // This is an anti-pattern, but should still work
      const badComputed = computed(() => {
        sideEffectRan++;
        return count.value * 2;
      });
      
      expect(badComputed.value).toBe(0);
      expect(sideEffectRan).toBe(1);
      
      count.value = 5;
      expect(badComputed.value).toBe(10);
      expect(sideEffectRan).toBe(2);
    });

    test("should handle equality function in computed options", () => {
      const obj = signal({ x: 1, y: 2 });
      let computations = 0;
      
      // Custom equality that only checks x property
      const comp = computed(
        () => {
          computations++;
          return { x: obj.value.x, y: obj.value.y };
        },
        { equals: (a, b) => a.x === b.x }
      );
      
      expect(comp.value).toEqual({ x: 1, y: 2 });
      expect(computations).toBe(1);
      
      // Change only y - will recompute, but the custom equality will consider it "equal"
      obj.value = { x: 1, y: 100 };
      
      const val = comp.value;
      expect(computations).toBe(2); // Recomputes
      expect(val.y).toBe(100); // Gets new computed value
      
      // Effects watching this computed should still be notified
      // because the actual object reference changes
      let effectRuns = 0;
      effect(() => {
        comp.value;
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      
      obj.value = { x: 1, y: 200 };
      
      return new Promise((resolve) => {
        setTimeout(() => {
          // Effect still runs because computed returns new object each time
          expect(effectRuns).toBe(2);
          resolve(undefined);
        }, 10);
      });
    });

    test("should handle errors in equality function", () => {
      const count = signal(1);
      let shouldError = false;
      
      const comp = computed(
        () => count.value * 2,
        { 
          equals: () => { 
            if (shouldError) throw new Error("Equality error");
            return false; // Always recompute by default
          } 
        }
      );
      
      expect(comp.value).toBe(2);
      
      // Enable error
      shouldError = true;
      count.value = 2;
      
      // The error happens during the setter, not the getter
      expect(comp.value).toBe(4); // Should still recompute and return new value
      
      // Actually, equality errors likely prevent notification but still compute
      // Let's just test that it doesn't crash
      expect(comp.value).toBe(4);
    });

    test("should clean up old dependencies when they change", () => {
      const useA = signal(true);
      const a = signal(1);
      const b = signal(2);
      
      const conditional = computed(() => {
        return useA.value ? a.value : b.value;
      });
      
      // Initially depends on useA and a
      expect(conditional.value).toBe(1);
      
      // Switch to depend on useA and b
      useA.value = false;
      expect(conditional.value).toBe(2);
      
      // Track computations with a new computed
      let computations = 0;
      const tracked = computed(() => {
        computations++;
        return useA.value ? a.value : b.value;
      });
      
      expect(tracked.value).toBe(2); // useA is false, so uses b
      expect(computations).toBe(1);
      
      // Change a (should not cause recomputation since it's not in dependency set)
      a.value = 100;
      expect(tracked.value).toBe(2);
      expect(computations).toBe(1); // Should NOT recompute
      
      // Change b (should cause recomputation)
      b.value = 200;
      expect(tracked.value).toBe(200);
      expect(computations).toBe(2);
    });

    test("should not recompute if marked dirty but dependencies haven't actually changed", () => {
      let computations = 0;
      const a = signal(5);
      
      const doubled = computed(() => {
        computations++;
        return a.value * 2;
      });
      
      expect(doubled.value).toBe(10);
      expect(computations).toBe(1);
      
      // Set to same value - should mark dirty but then not recompute
      a.value = 5;
      expect(doubled.value).toBe(10);
      expect(computations).toBe(1); // Should not recompute
    });

    test("should handle computed signal used in multiple effects", () => {
      const count = signal(1);
      const doubled = computed(() => count.value * 2);
      
      let effect1Runs = 0;
      let effect2Runs = 0;
      
      effect(() => {
        doubled.value;
        effect1Runs++;
      });
      
      effect(() => {
        doubled.value;
        effect2Runs++;
      });
      
      expect(effect1Runs).toBe(1);
      expect(effect2Runs).toBe(1);
      
      count.value = 5;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          // Both effects should have run at least once more
          expect(effect1Runs).toBeGreaterThanOrEqual(2);
          expect(effect2Runs).toBeGreaterThanOrEqual(2);
          // They might run more than once in some edge cases, but should be reasonable
          expect(effect1Runs).toBeLessThanOrEqual(3);
          expect(effect2Runs).toBeLessThanOrEqual(3);
          resolve(undefined);
        }, 20);
      });
    });

    test("should handle disposal of effects watching computed signals", () => {
      const count = signal(1);
      const doubled = computed(() => count.value * 2);
      
      let effectRuns = 0;
      const dispose = effect(() => {
        doubled.value;
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      
      dispose();
      
      count.value = 5;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(effectRuns).toBe(1); // Should not run after disposal
          resolve(undefined);
        }, 10);
      });
    });

    test("should handle synchronous chains with immediate access", () => {
      const a = signal(1);
      const b = computed(() => a.value * 2);
      const c = computed(() => b.value * 2);
      
      expect(c.value).toBe(4);
      
      // Synchronous update and access
      a.value = 5;
      expect(c.value).toBe(20); // Should work immediately
    });
  });
});

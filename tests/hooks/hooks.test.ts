import { describe, expect, test } from "bun:test";
import { signal } from "../../src/core/signal.js";
import { computed } from "../../src/core/computed.js";
import { useState } from "../../src/hooks/useState.js";
import { useEffect } from "../../src/hooks/useEffect.js";
import { useMemo } from "../../src/hooks/useMemo.js";
import { flushEffects } from "../../src/core/effect.js";

describe("useState", () => {
  test("should create a state signal", () => {
    const [count, setCount] = useState(0);

    expect(count()).toBe(0);

    setCount(5);
    expect(count()).toBe(5);
  });

  test("should accept updater function", () => {
    const [count, setCount] = useState(10);

    setCount((prev) => prev + 5);
    expect(count()).toBe(15);
  });
});

describe("useEffect", () => {
  test("should run effect immediately", () => {
    const [count, setCount] = signal(0);
    let runCount = 0;

    useEffect(() => {
      count();
      runCount++;
    });

    expect(runCount).toBe(1);
  });

  test("should re-run when dependencies change", async () => {
    const [count, setCount] = signal(0);
    let effectValue = 0;

    useEffect(() => {
      effectValue = count();
    });

    expect(effectValue).toBe(0);

    setCount(5);
    await flushEffects();

    expect(effectValue).toBe(5);
  });

  test("should return disposal function", async () => {
    const [count, setCount] = signal(0);
    let runCount = 0;

    const dispose = useEffect(() => {
      count();
      runCount++;
    });

    expect(runCount).toBe(1);

    setCount(1);
    await flushEffects();
    expect(runCount).toBe(2);

    dispose();

    setCount(2);
    await flushEffects();
    expect(runCount).toBe(2); // Should not run after disposal
  });

  test("should run cleanup function before re-running effect", async () => {
    const [count, setCount] = signal(0);
    const cleanups: number[] = [];

    useEffect(() => {
      const val = count();
      return () => {
        cleanups.push(val);
      };
    });

    setCount(1);
    await flushEffects();

    setCount(2);
    await flushEffects();

    // Cleanup should have been called for values 0 and 1
    expect(cleanups).toEqual([0, 1]);
  });

  test("should run cleanup on disposal", () => {
    let cleaned = false;

    const dispose = useEffect(() => {
      return () => {
        cleaned = true;
      };
    });

    expect(cleaned).toBe(false);

    dispose();

    expect(cleaned).toBe(true);
  });
});

describe("useMemo", () => {
  test("should compute value lazily", () => {
    const [count, setCount] = signal(5);
    let computeCount = 0;

    const doubled = useMemo(() => {
      computeCount++;
      return count() * 2;
    });

    // Not computed yet
    expect(computeCount).toBe(0);

    // First access computes
    expect(doubled()).toBe(10);
    expect(computeCount).toBe(1);

    // Second access doesn't recompute
    expect(doubled()).toBe(10);
    expect(computeCount).toBe(1);
  });

  test("should recompute when dependencies change", () => {
    const [count, setCount] = signal(5);
    let computeCount = 0;

    const doubled = useMemo(() => {
      computeCount++;
      return count() * 2;
    });

    expect(doubled()).toBe(10);
    expect(computeCount).toBe(1);

    setCount(10);

    expect(doubled()).toBe(20);
    expect(computeCount).toBe(2);
  });

  test("should support eager option", () => {
    const [count, setCount] = signal(5);
    let computeCount = 0;

    const doubled = useMemo(
      () => {
        computeCount++;
        return count() * 2;
      },
      { eager: true }
    );

    // With eager mode, it computes immediately
    expect(computeCount).toBe(1);
    expect(doubled()).toBe(10);
  });

  test("should support custom equality", () => {
    const [count, setCount] = signal(1);
    let computeCount = 0;

    // Custom equality that only cares if value >= 10
    const alwaysSame = (a: number, b: number) => {
      return Math.floor(a / 10) === Math.floor(b / 10);
    };

    const memoized = useMemo(() => {
      computeCount++;
      return count();
    }, { equals: alwaysSame });

    expect(memoized()).toBe(1);
    expect(computeCount).toBe(1);

    // Changes within same bucket shouldn't trigger downstream effects
    setCount(5);
    expect(memoized()).toBe(5);
    expect(computeCount).toBe(2); // It does recompute due to lazy eval
  });
});

// Edge case tests
describe("Edge Cases", () => {
  describe("useState edge cases", () => {
    test("should handle null values", () => {
      const [value, setValue] = useState<string | null>(null);
      
      expect(value()).toBeNull();
      
      setValue("not null");
      expect(value()).toBe("not null");
      
      setValue(null);
      expect(value()).toBeNull();
    });

    test("should handle undefined values", () => {
      const [value, setValue] = useState<string | undefined>(undefined);
      
      expect(value()).toBeUndefined();
      
      setValue("defined");
      expect(value()).toBe("defined");
      
      setValue(undefined);
      expect(value()).toBeUndefined();
    });

    test("should handle updater function with null/undefined", () => {
      const [value, setValue] = useState<number | null>(null);
      
      setValue((prev) => prev === null ? 10 : prev + 1);
      expect(value()).toBe(10);
      
      setValue((prev) => prev! + 5);
      expect(value()).toBe(15);
      
      setValue(() => null);
      expect(value()).toBeNull();
    });

    test("should handle complex objects", () => {
      const [obj, setObj] = useState({ a: 1, b: { c: 2 } });
      
      expect(obj()).toEqual({ a: 1, b: { c: 2 } });
      
      setObj((prev) => ({ ...prev, a: 10 }));
      expect(obj()).toEqual({ a: 10, b: { c: 2 } });
    });

    test("should handle arrays", () => {
      const [arr, setArr] = useState([1, 2, 3]);
      
      expect(arr()).toEqual([1, 2, 3]);
      
      setArr((prev) => [...prev, 4]);
      expect(arr()).toEqual([1, 2, 3, 4]);
    });

    test("should handle functions as updaters (cannot store function values directly)", () => {
      // Note: useState treats functions as updaters, not values
      // This is a known limitation - to store a function, use signal() directly
      const [value, setValue] = useState(42);
      
      setValue((prev) => prev * 2);
      expect(value()).toBe(84);
      
      setValue((prev) => prev + 10);
      expect(value()).toBe(94);
    });
  });

  describe("useEffect edge cases", () => {
    test("should handle effects with no dependencies", async () => {
      let runs = 0;
      
      useEffect(() => {
        runs++;
      });
      
      expect(runs).toBe(1);
      
      await flushEffects();
      expect(runs).toBe(1); // No dependencies, so won't run again
    });

    test("should handle async cleanup functions", async () => {
      const [count, setCount] = signal(0);
      const cleanups: number[] = [];
      
      useEffect(() => {
        const val = count();
        return () => {
          // Async cleanup
          Promise.resolve().then(() => {
            cleanups.push(val);
          });
        };
      });
      
      setCount(1);
      await flushEffects();

      // Flush microtasks from Promise.resolve inside cleanup
      await Promise.resolve();
      await Promise.resolve();

      expect(cleanups).toEqual([0]);
    });

    test("should handle errors in effect function", async () => {
      const [shouldError, setShouldError] = signal(false);
      let successfulRuns = 0;
      const originalConsoleError = console.error;
      const consoleErrors: unknown[][] = [];
      console.error = (...args: unknown[]) => {
        consoleErrors.push(args);
      };
      
      try {
        useEffect(() => {
          if (shouldError()) {
            throw new Error("Effect error");
          }
          successfulRuns++;
        });

        expect(successfulRuns).toBe(1);

        setShouldError(true);
        await flushEffects();

        // Error is logged but doesn't stop the effect system
        expect(successfulRuns).toBe(1);
        expect(consoleErrors).toHaveLength(1);
        expect(String(consoleErrors[0]?.[0])).toBe("Error running effect:");
        expect((consoleErrors[0]?.[1] as Error).message).toBe("Effect error");
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("should handle errors in cleanup function", async () => {
      const [count, setCount] = signal(0);
      let shouldError = false;
      const originalConsoleError = console.error;
      const consoleErrors: unknown[][] = [];
      console.error = (...args: unknown[]) => {
        consoleErrors.push(args);
      };
      
      try {
        useEffect(() => {
          count();
          return () => {
            if (shouldError) {
              throw new Error("Cleanup error");
            }
          };
        });

        shouldError = true;
        setCount(1);

        // Cleanup error should be caught and logged
        await flushEffects();

        // Effect should still work
        expect(count()).toBe(1);
        expect(consoleErrors).toHaveLength(1);
        expect(String(consoleErrors[0]?.[0])).toBe("Error running effect:");
        expect((consoleErrors[0]?.[1] as Error).message).toBe("Cleanup error");
      } finally {
        console.error = originalConsoleError;
      }
    });

    test("should handle cleanup on disposal even without dependencies", () => {
      let cleaned = false;
      
      const dispose = useEffect(() => {
        return () => {
          cleaned = true;
        };
      });
      
      expect(cleaned).toBe(false);
      dispose();
      expect(cleaned).toBe(true);
    });

    test("should handle conditional dependencies", async () => {
      const [useA, setUseA] = signal(true);
      const [a, setA] = signal(1);
      const [b, setB] = signal(10);
      let runs = 0;
      let lastValue = 0;
      
      useEffect(() => {
        runs++;
        lastValue = useA() ? a() : b();
      });
      
      expect(runs).toBe(1);
      expect(lastValue).toBe(1);
      
      // Change b (not currently used)
      setB(20);
      await flushEffects();
      
      // Should not trigger because b isn't in dependency set
      expect(runs).toBe(1);
      
      // Switch to b
      setUseA(false);
      await flushEffects();
      
      expect(runs).toBe(2);
      expect(lastValue).toBe(20);
    });

    test("should handle multiple cleanups in sequence", async () => {
      const [count, setCount] = signal(0);
      const cleanups: number[] = [];
      
      useEffect(() => {
        const val = count();
        return () => {
          cleanups.push(val);
        };
      });
      
      for (let i = 1; i <= 5; i++) {
        setCount(i);
        await flushEffects();
      }
      
      expect(cleanups).toEqual([0, 1, 2, 3, 4]);
    });

    test("should handle disposal multiple times safely", () => {
      let runs = 0;
      
      const dispose = useEffect(() => {
        runs++;
      });
      
      expect(runs).toBe(1);
      
      dispose();
      dispose();
      dispose();
      
      // Should not crash
      expect(runs).toBe(1);
    });
  });

  describe("useMemo edge cases", () => {
    test("should handle null and undefined values", () => {
      const [nullable, setNullable] = signal(null);
      const [undefinable, setUndefinable] = signal(undefined);
      
      const memoNull = useMemo(() => nullable() ?? 42);
      const memoUndef = useMemo(() => undefinable() ?? 42);
      
      expect(memoNull()).toBe(42);
      expect(memoUndef()).toBe(42);
      
      setNullable(10);
      setUndefinable(20);
      
      expect(memoNull()).toBe(10);
      expect(memoUndef()).toBe(20);
    });

    test("should handle errors in compute function", () => {
      const [shouldError, setShouldError] = signal(false);
      
      const memoized = useMemo(() => {
        if (shouldError()) {
          throw new Error("Compute error");
        }
        return 42;
      });
      
      expect(memoized()).toBe(42);
      
      setShouldError(true);
      expect(() => memoized()).toThrow("Compute error");
    });

    test("should handle memoization with no dependencies", () => {
      let computeCount = 0;
      
      const constant = useMemo(() => {
        computeCount++;
        return 42;
      });
      
      expect(constant()).toBe(42);
      expect(computeCount).toBe(1);
      
      // Access multiple times
      expect(constant()).toBe(42);
      expect(constant()).toBe(42);
      expect(computeCount).toBe(1); // Should only compute once
    });

    test("should handle complex equality functions", () => {
      const [obj, setObj] = signal({ x: 1, y: 2 });
      let computeCount = 0;
      
      const memoized = useMemo(
        () => {
          computeCount++;
          return { x: obj().x, y: obj().y };
        },
        { equals: (a, b) => a.x === b.x && a.y === b.y }
      );
      
      const first = memoized();
      expect(first).toEqual({ x: 1, y: 2 });
      expect(computeCount).toBe(1);
      
      // Change to same values
      setObj({ x: 1, y: 2 });
      const second = memoized();
      
      expect(computeCount).toBe(2); // Recomputes
      expect(second).toEqual({ x: 1, y: 2 });
    });

    test("should handle errors in equality function", () => {
      const [count, setCount] = signal(1);
      let shouldError = false;
      
      const memoized = useMemo(
        () => count() * 2,
        {
          equals: () => {
            if (shouldError) throw new Error("Equality error");
            return false;
          }
        }
      );
      
      expect(memoized()).toBe(2);
      
      shouldError = true;
      setCount(2);
      
      // Should still compute even if equality check fails
      expect(memoized()).toBe(4);
    });

    test("should handle conditional dependencies in memoization", () => {
      const [useA, setUseA] = signal(true);
      const [a, setA] = signal(1);
      const [b, setB] = signal(100);
      let computeCount = 0;
      
      const conditional = useMemo(() => {
        computeCount++;
        return useA() ? a() : b();
      });
      
      expect(conditional()).toBe(1);
      expect(computeCount).toBe(1);
      
      // Change b (not currently used)
      setB(200);
      expect(conditional()).toBe(1);
      expect(computeCount).toBe(1); // Should not recompute
      
      // Switch to b
      setUseA(false);
      expect(conditional()).toBe(200);
      expect(computeCount).toBe(2);
    });

    test("should handle very expensive computations", () => {
      const [count, setCount] = signal(5);
      let computeCount = 0;
      
      const expensive = useMemo(() => {
        computeCount++;
        let sum = 0;
        for (let i = 0; i < count() * 1000; i++) {
          sum += i;
        }
        return sum;
      });
      
      const first = expensive();
      expect(computeCount).toBe(1);
      
      // Access again - should not recompute
      const second = expensive();
      expect(computeCount).toBe(1);
      expect(second).toBe(first);
    });
  });
});

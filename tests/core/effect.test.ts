import { describe, expect, test } from "bun:test";
import { signal } from "../../src/core/signal.js";
import { effect, batch, flushEffects } from "../../src/core/effect.js";

describe("Effect", () => {
  test("should run effect immediately", () => {
    const count = signal(0);
    let runCount = 0;

    effect(() => {
      count.value;
      runCount++;
    });

    expect(runCount).toBe(1);
  });

  test("should re-run effect when dependency changes", async () => {
    const count = signal(0);
    let effectValue = 0;

    effect(() => {
      effectValue = count.value;
    });

    expect(effectValue).toBe(0);

    count.value = 5;
    await flushEffects(); // Wait for async effects to run

    expect(effectValue).toBe(5);
  });

  test("should return dispose function", async () => {
    const count = signal(0);
    let runCount = 0;

    const dispose = effect(() => {
      count.value;
      runCount++;
    });

    expect(runCount).toBe(1);

    count.value = 1;
    await flushEffects();
    expect(runCount).toBe(2);

    dispose();

    count.value = 2;
    await flushEffects();
    expect(runCount).toBe(2); // Should not run after disposal
  });

  test("should cleanup and re-subscribe on each run", async () => {
    const condition = signal(true);
    const a = signal(1);
    const b = signal(10);
    let result = 0;

    effect(() => {
      result = condition.value ? a.value : b.value;
    });

    expect(result).toBe(1);

    // Change a, should trigger effect
    a.value = 2;
    await flushEffects();
    expect(result).toBe(2);

    // Change condition to false
    condition.value = false;
    await flushEffects();
    expect(result).toBe(10);

    // Change a, should NOT trigger effect anymore
    a.value = 3;
    await flushEffects();
    expect(result).toBe(10); // Still 10, not affected by a

    // Change b, should trigger effect
    b.value = 20;
    await flushEffects();
    expect(result).toBe(20);
  });
});

describe("batch", () => {
  test("should batch multiple signal updates", async () => {
    const a = signal(1);
    const b = signal(2);
    let runCount = 0;
    let sum = 0;

    effect(() => {
      sum = a.value + b.value;
      runCount++;
    });

    expect(runCount).toBe(1);
    expect(sum).toBe(3);

    // Without batch, this would trigger effect twice
    batch(() => {
      a.value = 10;
      b.value = 20;
    });

    await flushEffects();

    expect(sum).toBe(30);
    expect(runCount).toBe(2); // Should only run once more, not twice
  });

  test("should handle nested batches", async () => {
    const count = signal(0);
    let runCount = 0;

    effect(() => {
      count.value;
      runCount++;
    });

    expect(runCount).toBe(1);

    batch(() => {
      count.value = 1;
      batch(() => {
        count.value = 2;
        count.value = 3;
      });
      count.value = 4;
    });

    await flushEffects();

    expect(count.value).toBe(4);
    expect(runCount).toBe(2); // Should only run once more
  });
});

describe("flushEffects", () => {
  test("should flush all pending effects", async () => {
    const count = signal(0);
    let effectRan = false;

    effect(() => {
      count.value;
      effectRan = true;
    });

    effectRan = false;
    count.value = 5;

    expect(effectRan).toBe(false); // Effect hasn't run yet

    await flushEffects();

    expect(effectRan).toBe(true); // Effect ran after flush
  });

  test("should return a promise", async () => {
    const result = flushEffects();
    expect(result).toBeInstanceOf(Promise);
    await result; // Ensure it resolves
  });
});

describe("Infinite loop protection", () => {
  test("should detect and prevent infinite loops", async () => {
    const count = signal(0);
    let errorThrown = false;

    try {
      effect(() => {
        // This creates an infinite loop
        count.value = count.value + 1;
      });

      // Try to flush effects multiple times
      for (let i = 0; i < 10; i++) {
        await flushEffects();
      }
    } catch (error) {
      errorThrown = true;
      expect((error as Error).message).toMatch(
        /^Effect flush exceeded maximum iterations \(100\)\./
      );
    }

    expect(errorThrown).toBe(true);
  });
});

// Edge case tests
describe("Edge Cases", () => {
  test("should handle errors in effect function", async () => {
    const shouldError = signal(false);
    const count = signal(0);
    let successfulRuns = 0;
    const originalConsoleError = console.error;
    const consoleErrors: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args);
    };
    
    try {
      // Errors are logged but don't propagate
      effect(() => {
        if (shouldError.value) {
          throw new Error("Effect error");
        }
        count.value;
        successfulRuns++;
      });

      expect(successfulRuns).toBe(1);

      // Trigger error - should be logged but caught
      shouldError.value = true;
      await flushEffects();

      // Effect continues to run despite the error
      expect(successfulRuns).toBe(1);
      expect(consoleErrors).toHaveLength(1);
      expect(String(consoleErrors[0]?.[0])).toBe("Error running effect:");
      expect((consoleErrors[0]?.[1] as Error).message).toBe("Effect error");
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("should handle nested effects", async () => {
    const outer = signal(1);
    const inner = signal(10);
    let outerRuns = 0;
    let innerRuns = 0;
    
    effect(() => {
      outer.value;
      outerRuns++;
      
      effect(() => {
        inner.value;
        innerRuns++;
      });
    });
    
    expect(outerRuns).toBe(1);
    expect(innerRuns).toBe(1);
    
    outer.value = 2;
    await flushEffects();
    
    // Outer runs again and creates exactly one new nested effect
    expect(outerRuns).toBe(2);
    expect(innerRuns).toBe(2);
  });

  test("should handle effects that modify multiple signals", async () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    let runs = 0;
    
    effect(() => {
      runs++;
      const sum = a.value + b.value;
      c.value = sum;
    });
    
    expect(runs).toBe(1);
    expect(c.value).toBe(3);
    
    a.value = 10;
    await flushEffects();
    
    expect(c.value).toBe(12);
    expect(runs).toBe(2);
  });

  test("should handle effect disposal", async () => {
    const count = signal(0);
    let runs = 0;
    
    const dispose = effect(() => {
      count.value;
      runs++;
    });
    
    expect(runs).toBe(1);
    
    count.value = 1;
    await flushEffects();
    expect(runs).toBe(2);
    
    // Dispose the effect
    dispose();
    
    count.value = 2;
    await flushEffects();
    
    expect(runs).toBe(2); // Should not run after disposal
    
    // Disposing multiple times should be safe
    dispose();
    dispose();
  });

  test("should handle disposed effect gracefully", async () => {
    const count = signal(0);
    let runs = 0;
    
    const dispose = effect(() => {
      count.value;
      runs++;
    });
    
    expect(runs).toBe(1);
    
    dispose();
    
    count.value = 5;
    await flushEffects();
    
    expect(runs).toBe(1); // Should not run after disposal
    
    // Disposing again should be safe
    dispose();
    dispose();
  });

  test("should handle effects with no dependencies", async () => {
    let runs = 0;
    
    effect(() => {
      runs++;
      // No signal access
    });
    
    expect(runs).toBe(1);
    
    // Should not run again since there are no dependencies
    await flushEffects();
    expect(runs).toBe(1);
  });

  test("should handle effects that conditionally read signals", async () => {
    const shouldRead = signal(true);
    const value = signal(10);
    let runs = 0;
    let lastValue = 0;
    
    effect(() => {
      runs++;
      if (shouldRead.value) {
        lastValue = value.value;
      }
    });
    
    expect(runs).toBe(1);
    expect(lastValue).toBe(10);
    
    value.value = 20;
    await flushEffects();
    
    expect(runs).toBe(2);
    expect(lastValue).toBe(20);
    
    // Stop reading value
    shouldRead.value = false;
    await flushEffects();
    
    expect(runs).toBe(3);
    
    // Changing value should not trigger effect now
    value.value = 30;
    await flushEffects();
    
    expect(runs).toBe(3); // Should not run
    expect(lastValue).toBe(20); // Still old value
  });

  test("should handle batch within effect", async () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(0);
    let runs = 0;
    
    effect(() => {
      runs++;
      batch(() => {
        c.value = a.value + b.value;
      });
    });
    
    expect(runs).toBe(1);
    expect(c.value).toBe(3);
    
    a.value = 10;
    await flushEffects();
    
    expect(c.value).toBe(12);
  });

  test("should handle rapid signal updates", async () => {
    const count = signal(0);
    let runs = 0;
    let lastValue = 0;
    
    effect(() => {
      runs++;
      lastValue = count.value;
    });
    
    expect(runs).toBe(1);
    
    // Rapid updates
    for (let i = 1; i <= 100; i++) {
      count.value = i;
    }
    
    await flushEffects();
    
    expect(lastValue).toBe(100);
    expect(runs).toBe(2);
  });

  test("should handle effect disposing itself", async () => {
    const count = signal(0);
    let runs = 0;
    let dispose: (() => void) | undefined;
    
    dispose = effect(() => {
      runs++;
      count.value;
      
      if (count.value >= 3) {
        dispose?.();
      }
    });
    
    expect(runs).toBe(1);
    
    count.value = 1;
    await flushEffects();
    expect(runs).toBe(2);
    
    count.value = 2;
    await flushEffects();
    expect(runs).toBe(3);
    
    count.value = 3;
    await flushEffects();
    expect(runs).toBe(4);
    
    // Should not run anymore
    count.value = 4;
    await flushEffects();
    expect(runs).toBe(4);
  });

  test("should handle multiple disposes in sequence", async () => {
    const count = signal(0);
    let runs1 = 0;
    let runs2 = 0;
    let runs3 = 0;
    
    const dispose1 = effect(() => {
      count.value;
      runs1++;
    });
    
    const dispose2 = effect(() => {
      count.value;
      runs2++;
    });
    
    const dispose3 = effect(() => {
      count.value;
      runs3++;
    });
    
    expect(runs1).toBe(1);
    expect(runs2).toBe(1);
    expect(runs3).toBe(1);
    
    count.value = 1;
    await flushEffects();
    
    expect(runs1).toBe(2);
    expect(runs2).toBe(2);
    expect(runs3).toBe(2);
    
    dispose2();
    
    count.value = 2;
    await flushEffects();
    
    expect(runs1).toBe(3);
    expect(runs2).toBe(2); // Disposed
    expect(runs3).toBe(3);
    
    dispose1();
    dispose3();
    
    count.value = 3;
    await flushEffects();
    
    expect(runs1).toBe(3); // All disposed
    expect(runs2).toBe(2);
    expect(runs3).toBe(3);
  });

  test("should handle async operations in effects", async () => {
    const count = signal(0);
    const results: number[] = [];
    
    effect(() => {
      const value = count.value;
      // Simulate async operation
      Promise.resolve().then(() => {
        results.push(value);
      });
    });
    
    count.value = 1;
    count.value = 2;
    count.value = 3;
    
    await flushEffects();
    
    // Flush Promise callbacks created by the effect runs
    await Promise.resolve();
    await Promise.resolve();

    expect(results).toEqual([0, 3]);
  });

  test("should handle accessing same signal multiple times in effect", async () => {
    const count = signal(5);
    let runs = 0;
    let sum = 0;
    
    effect(() => {
      runs++;
      // Access same signal multiple times
      sum = count.value + count.value + count.value;
    });
    
    expect(runs).toBe(1);
    expect(sum).toBe(15);
    
    count.value = 10;
    await flushEffects();
    
    expect(runs).toBe(2);
    expect(sum).toBe(30);
  });

  test("should handle null and undefined values in effects", async () => {
    const nullable = signal<number | null>(null);
    const undefinable = signal<number | undefined>(undefined);
    let nullRuns = 0;
    let undefinedRuns = 0;
    
    effect(() => {
      nullable.value;
      nullRuns++;
    });
    
    effect(() => {
      undefinable.value;
      undefinedRuns++;
    });
    
    expect(nullRuns).toBe(1);
    expect(undefinedRuns).toBe(1);
    
    nullable.value = 5;
    undefinable.value = 10;
    
    await flushEffects();
    
    expect(nullRuns).toBe(2);
    expect(undefinedRuns).toBe(2);
  });

  test("should handle effects without cleanup functions", async () => {
    const count = signal(0);
    let runs = 0;
    
    // Effect function doesn't return cleanup
    effect(() => {
      count.value;
      runs++;
    });
    
    expect(runs).toBe(1);
    
    count.value = 1;
    await flushEffects();
    expect(runs).toBe(2);
    
    count.value = 2;
    await flushEffects();
    expect(runs).toBe(3);
  });
});

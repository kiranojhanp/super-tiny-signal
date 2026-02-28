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
      expect((error as Error).message).toContain("exceeded maximum iterations");
    }

    expect(errorThrown).toBe(true);
  });
});

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

    expect(count.value).toBe(0);

    setCount(5);
    expect(count.value).toBe(5);
  });

  test("should accept updater function", () => {
    const [count, setCount] = useState(10);

    setCount((prev) => prev + 5);
    expect(count.value).toBe(15);
  });
});

describe("useEffect", () => {
  test("should run effect immediately", () => {
    const count = signal(0);
    let runCount = 0;

    useEffect(() => {
      count.value;
      runCount++;
    });

    expect(runCount).toBe(1);
  });

  test("should re-run when dependencies change", async () => {
    const count = signal(0);
    let effectValue = 0;

    useEffect(() => {
      effectValue = count.value;
    });

    expect(effectValue).toBe(0);

    count.value = 5;
    await flushEffects();

    expect(effectValue).toBe(5);
  });

  test("should return disposal function", async () => {
    const count = signal(0);
    let runCount = 0;

    const dispose = useEffect(() => {
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

  test("should run cleanup function before re-running effect", async () => {
    const count = signal(0);
    const cleanups: number[] = [];

    useEffect(() => {
      const val = count.value;
      return () => {
        cleanups.push(val);
      };
    });

    count.value = 1;
    await flushEffects();

    count.value = 2;
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
    const count = signal(5);
    let computeCount = 0;

    const doubled = useMemo(() => {
      computeCount++;
      return count.value * 2;
    });

    // Not computed yet
    expect(computeCount).toBe(0);

    // First access computes
    expect(doubled.value).toBe(10);
    expect(computeCount).toBe(1);

    // Second access doesn't recompute
    expect(doubled.value).toBe(10);
    expect(computeCount).toBe(1);
  });

  test("should recompute when dependencies change", () => {
    const count = signal(5);
    let computeCount = 0;

    const doubled = useMemo(() => {
      computeCount++;
      return count.value * 2;
    });

    expect(doubled.value).toBe(10);
    expect(computeCount).toBe(1);

    count.value = 10;

    expect(doubled.value).toBe(20);
    expect(computeCount).toBe(2);
  });

  test("should support eager option", () => {
    const count = signal(5);
    let computeCount = 0;

    const doubled = useMemo(
      () => {
        computeCount++;
        return count.value * 2;
      },
      { eager: true }
    );

    // With eager mode, it computes immediately
    expect(computeCount).toBe(1);
    expect(doubled.value).toBe(10);
  });

  test("should support custom equality", () => {
    const count = signal(1);
    let computeCount = 0;

    // Custom equality that only cares if value >= 10
    const alwaysSame = (a: number, b: number) => {
      return Math.floor(a / 10) === Math.floor(b / 10);
    };

    const memoized = useMemo(() => {
      computeCount++;
      return count.value;
    }, { equals: alwaysSame });

    expect(memoized.value).toBe(1);
    expect(computeCount).toBe(1);

    // Changes within same bucket shouldn't trigger downstream effects
    count.value = 5;
    expect(memoized.value).toBe(5);
    expect(computeCount).toBe(2); // It does recompute due to lazy eval
  });
});

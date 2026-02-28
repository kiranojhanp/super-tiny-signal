import { describe, expect, test } from "bun:test";
import { signal } from "../../src/core/signal.js";
import { effect } from "../../src/core/effect.js";

describe("Signal", () => {
  test("should create a signal with initial value", () => {
    const count = signal(0);
    expect(count.value).toBe(0);
  });

  test("should update signal value", () => {
    const count = signal(0);
    count.value = 5;
    expect(count.value).toBe(5);
  });

  test("should notify effects when value changes", () => {
    const count = signal(0);
    let effectRuns = 0;
    let lastValue = 0;

    effect(() => {
      lastValue = count.value;
      effectRuns++;
    });

    // Effect runs immediately
    expect(effectRuns).toBe(1);
    expect(lastValue).toBe(0);

    count.value = 10;
    
    // Wait for microtask to flush
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(effectRuns).toBe(2);
        expect(lastValue).toBe(10);
        resolve(undefined);
      }, 10);
    });
  });

  test("should not notify effects when value doesn't change", () => {
    const count = signal(5);
    let effectRuns = 0;

    effect(() => {
      count.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Set to same value
    count.value = 5;

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(effectRuns).toBe(1); // Should not run again
        resolve(undefined);
      }, 10);
    });
  });

  test("should use custom equality function", () => {
    const obj = signal({ x: 1 }, { equals: (a, b) => a.x === b.x });
    let effectRuns = 0;

    effect(() => {
      obj.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Different object, same x value
    obj.value = { x: 1 };

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(effectRuns).toBe(1); // Should not run due to custom equality
        resolve(undefined);
      }, 10);
    });
  });

  test("should remove disposed effects", () => {
    const count = signal(0);
    let effectRuns = 0;

    const dispose = effect(() => {
      count.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    dispose();
    count.value = 10;

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(effectRuns).toBe(1); // Should not run after disposal
        resolve(undefined);
      }, 10);
    });
  });

  test("should handle multiple effects on same signal", () => {
    const count = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;

    effect(() => {
      count.value;
      effect1Runs++;
    });

    effect(() => {
      count.value;
      effect2Runs++;
    });

    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    count.value = 5;

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(effect1Runs).toBe(2);
        expect(effect2Runs).toBe(2);
        resolve(undefined);
      }, 10);
    });
  });

  test("should work with different data types", () => {
    const stringSignal = signal("hello");
    const arraySignal = signal([1, 2, 3]);
    const objectSignal = signal({ name: "test" });
    const boolSignal = signal(true);

    expect(stringSignal.value).toBe("hello");
    expect(arraySignal.value).toEqual([1, 2, 3]);
    expect(objectSignal.value).toEqual({ name: "test" });
    expect(boolSignal.value).toBe(true);

    stringSignal.value = "world";
    arraySignal.value = [4, 5, 6];
    objectSignal.value = { name: "updated" };
    boolSignal.value = false;

    expect(stringSignal.value).toBe("world");
    expect(arraySignal.value).toEqual([4, 5, 6]);
    expect(objectSignal.value).toEqual({ name: "updated" });
    expect(boolSignal.value).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";

import { signal } from "../../src/core/signal.js";
import { computed } from "../../src/core/computed.js";
import { batch, effect, flushEffects } from "../../src/core/effect.js";

describe("callable signal api", () => {
  test("reads and writes with function calls", () => {
    const count = signal(0);

    expect(count()).toBe(0);
    expect(count(2)).toBe(2);
    expect(count()).toBe(2);
    expect(count((prev) => prev + 3)).toBe(5);
    expect(count()).toBe(5);
  });

  test("still supports .value compatibility", () => {
    const count = signal(1);

    count.value = 4;
    expect(count.value).toBe(4);
    expect(count()).toBe(4);
  });

  test("tracks callable reads in effects", async () => {
    const count = signal(1);
    let seen = 0;

    effect(() => {
      seen = count();
    });

    expect(seen).toBe(1);
    count(9);
    await flushEffects();
    expect(seen).toBe(9);
  });

  test("supports callable computed reads", async () => {
    const count = signal(2);
    const doubled = computed(() => count() * 2);

    expect(doubled()).toBe(4);
    count(10);
    await flushEffects();
    expect(doubled()).toBe(20);
    expect(doubled.value).toBe(20);
  });

  test("dedupes effect runs in batch", async () => {
    const count = signal(0);
    let runs = 0;

    effect(() => {
      count();
      runs++;
    });

    batch(() => {
      count(1);
      count(2);
      count((prev) => prev + 1);
    });

    await flushEffects();
    expect(runs).toBe(2);
    expect(count()).toBe(3);
  });
});

import { describe, expect, test } from "bun:test";
import { createStore } from "../../src/store/createStore.js";
import { flushEffects } from "../../src/core/effect.js";

describe("createStore", () => {
  test("should create a store with initial state", () => {
    const store = createStore(() => ({ count: 0, name: "test" }));

    expect(store.count.value).toBe(0);
    expect(store.name.value).toBe("test");
  });

  test("should expose getState method", () => {
    const store = createStore(() => ({ count: 5, name: "test" }));

    const state = store.getState();

    expect(state).toEqual({ count: 5, name: "test" });
  });

  test("should expose setState method", () => {
    const store = createStore(() => ({ count: 0, name: "test" }));

    store.setState({ count: 10 });

    expect(store.count.value).toBe(10);
    expect(store.name.value).toBe("test"); // Unchanged
  });

  test("should expose subscribe method", async () => {
    const store = createStore(() => ({ count: 0 }));
    const updates: Array<{ count: number }> = [];

    const unsubscribe = store.subscribe((state) => {
      updates.push(state);
    });

    store.count.value = 5;
    await flushEffects();

    store.count.value = 10;
    await flushEffects();

    expect(updates).toEqual([{ count: 5 }, { count: 10 }]);

    unsubscribe();

    store.count.value = 20;
    await flushEffects();

    // Should not receive update after unsubscribe
    expect(updates).toEqual([{ count: 5 }, { count: 10 }]);
  });

  test("should allow updating individual signal properties", () => {
    const store = createStore(() => ({ count: 0, name: "initial" }));

    store.count.value = 42;
    store.name.value = "updated";

    expect(store.count.value).toBe(42);
    expect(store.name.value).toBe("updated");
  });

  test("should allow methods in store", () => {
    const store = createStore((set, get) => ({
      count: 0,
      increment: () => set({ count: get().count + 1 }),
      decrement: () => set({ count: get().count - 1 }),
    }));

    expect(store.count.value).toBe(0);

    store.increment();
    expect(store.count.value).toBe(1);

    store.increment();
    store.increment();
    expect(store.count.value).toBe(3);

    store.decrement();
    expect(store.count.value).toBe(2);
  });

  test("should reject reserved property name 'getState'", () => {
    expect(() => {
      createStore(() => ({ getState: "invalid" } as unknown as Record<string, unknown>));
    }).toThrow("reserved");
  });

  test("should reject reserved property name 'setState'", () => {
    expect(() => {
      createStore(() => ({ setState: "invalid" } as unknown as Record<string, unknown>));
    }).toThrow("reserved");
  });

  test("should reject reserved property name 'subscribe'", () => {
    expect(() => {
      createStore(() => ({ subscribe: "invalid" } as unknown as Record<string, unknown>));
    }).toThrow("reserved");
  });

  test("should handle nested objects", () => {
    const store = createStore(() => ({
      user: { name: "Alice", age: 30 },
      settings: { theme: "dark" },
    }));

    expect(store.user.value).toEqual({ name: "Alice", age: 30 });
    expect(store.settings.value).toEqual({ theme: "dark" });

    store.user.value = { name: "Bob", age: 25 };

    expect(store.user.value).toEqual({ name: "Bob", age: 25 });
  });

  test("should work with arrays", () => {
    const store = createStore(() => ({ items: [1, 2, 3] }));

    expect(store.items.value).toEqual([1, 2, 3]);

    store.items.value = [4, 5, 6];

    expect(store.items.value).toEqual([4, 5, 6]);
  });
});

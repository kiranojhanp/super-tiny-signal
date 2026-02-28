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

// Edge case tests
describe("Store Edge Cases", () => {
  test("should handle concurrent setState calls", () => {
    const store = createStore(() => ({ a: 1, b: 2, c: 3 }));
    
    // Call setState multiple times in quick succession
    store.setState({ a: 10 });
    store.setState({ b: 20 });
    store.setState({ c: 30 });
    
    expect(store.a.value).toBe(10);
    expect(store.b.value).toBe(20);
    expect(store.c.value).toBe(30);
  });

  test("should handle setState with function updater", () => {
    const store = createStore(() => ({ count: 0, name: "test" }));
    
    store.setState((state) => ({ count: state.count + 10 }));
    expect(store.count.value).toBe(10);
    
    store.setState((state) => ({ count: state.count * 2, name: "updated" }));
    expect(store.count.value).toBe(20);
    expect(store.name.value).toBe("updated");
  });

  test("should handle invalid property access", () => {
    const store = createStore(() => ({ count: 0 }));
    
    // Accessing non-existent property should throw or return undefined
    // This depends on TypeScript, at runtime it might be undefined
    expect((store as unknown as Record<string, unknown>).nonExistent).toBeUndefined();
  });

  test("should handle setState during subscription", async () => {
    const store = createStore(() => ({ count: 0 }));
    let subscriptionRuns = 0;
    
    store.subscribe((state) => {
      subscriptionRuns++;
      // Try to modify state during subscription
      if (state.count === 1) {
        store.setState({ count: 100 });
      }
    });
    
    store.count.value = 1;
    await flushEffects();
    
    expect(subscriptionRuns).toBeGreaterThan(0);
    expect(store.count.value).toBe(100);
  });

  test("should handle deep equality with nested objects", () => {
    const store = createStore(() => ({
      user: { name: "Alice", profile: { age: 30 } }
    }));
    
    const original = store.user.value;
    
    // Set to same nested structure (different object reference)
    store.user.value = { name: "Alice", profile: { age: 30 } };
    
    // Should be different reference
    expect(store.user.value).not.toBe(original);
    expect(store.user.value).toEqual(original);
  });

  test("should handle frozen objects", () => {
    const frozenObj = Object.freeze({ value: 42 });
    const store = createStore(() => ({ frozen: frozenObj }));
    
    expect(store.frozen.value).toBe(frozenObj);
    expect(Object.isFrozen(store.frozen.value)).toBe(true);
    
    // Should be able to replace frozen object
    const newFrozen = Object.freeze({ value: 100 });
    store.frozen.value = newFrozen;
    expect(store.frozen.value).toBe(newFrozen);
  });

  test("should handle sealed objects", () => {
    const sealedObj = Object.seal({ value: 42 });
    const store = createStore(() => ({ sealed: sealedObj }));
    
    expect(store.sealed.value).toBe(sealedObj);
    expect(Object.isSealed(store.sealed.value)).toBe(true);
  });

  test("should handle null and undefined values", () => {
    const store = createStore(() => ({
      nullable: null as number | null,
      undefinable: undefined as number | undefined
    }));
    
    expect(store.nullable.value).toBeNull();
    expect(store.undefinable.value).toBeUndefined();
    
    store.nullable.value = 42;
    store.undefinable.value = 100;
    
    expect(store.nullable.value).toBe(42);
    expect(store.undefinable.value).toBe(100);
  });

  test("should handle multiple subscribers", async () => {
    const store = createStore(() => ({ count: 0 }));
    
    const updates1: number[] = [];
    const updates2: number[] = [];
    const updates3: number[] = [];
    
    const unsub1 = store.subscribe((state) => updates1.push(state.count));
    const unsub2 = store.subscribe((state) => updates2.push(state.count));
    const unsub3 = store.subscribe((state) => updates3.push(state.count));
    
    store.count.value = 5;
    await flushEffects();
    
    expect(updates1).toContain(5);
    expect(updates2).toContain(5);
    expect(updates3).toContain(5);
    
    unsub2();
    
    store.count.value = 10;
    await flushEffects();
    
    expect(updates1).toContain(10);
    expect(updates2).not.toContain(10); // Unsubscribed
    expect(updates3).toContain(10);
    
    unsub1();
    unsub3();
  });

  test("should handle unsubscribe called multiple times", async () => {
    const store = createStore(() => ({ count: 0 }));
    const updates: number[] = [];
    
    const unsubscribe = store.subscribe((state) => {
      updates.push(state.count);
    });
    
    store.count.value = 1;
    await flushEffects();
    
    expect(updates).toContain(1);
    
    unsubscribe();
    unsubscribe(); // Should be safe to call multiple times
    unsubscribe();
    
    store.count.value = 2;
    await flushEffects();
    
    expect(updates).not.toContain(2);
  });

  test("should handle errors in subscriber callbacks", async () => {
    const store = createStore(() => ({ count: 0 }));
    let shouldError = false;
    let successfulCalls = 0;
    
    store.subscribe(() => {
      if (shouldError) {
        throw new Error("Subscriber error");
      }
      successfulCalls++;
    });
    
    store.count.value = 1;
    await flushEffects();
    expect(successfulCalls).toBe(1);
    
    shouldError = true;
    store.count.value = 2;
    await flushEffects();
    
    // Error should be caught and logged
    expect(successfulCalls).toBe(1);
  });

  test("should handle very large stores", () => {
    const largeState = Object.fromEntries(
      Array.from({ length: 1000 }, (_, i) => [`field${i}`, i])
    );
    
    const store = createStore(() => largeState);
    
    expect((store as Record<string, { value: number }>).field0.value).toBe(0);
    expect((store as Record<string, { value: number }>).field999.value).toBe(999);
    
    (store as Record<string, { value: number }>).field500.value = 5000;
    expect((store as Record<string, { value: number }>).field500.value).toBe(5000);
  });

  test("should handle setState with empty object", () => {
    const store = createStore(() => ({ a: 1, b: 2 }));
    
    store.setState({});
    
    // Should not change anything
    expect(store.a.value).toBe(1);
    expect(store.b.value).toBe(2);
  });

  test("should handle setState with partial updates", () => {
    const store = createStore(() => ({ a: 1, b: 2, c: 3 }));
    
    store.setState({ b: 20 });
    
    expect(store.a.value).toBe(1);
    expect(store.b.value).toBe(20);
    expect(store.c.value).toBe(3);
    
    store.setState({ a: 10, c: 30 });
    
    expect(store.a.value).toBe(10);
    expect(store.b.value).toBe(20);
    expect(store.c.value).toBe(30);
  });

  test("should handle methods that use get and set", () => {
    const store = createStore((set, get) => ({
      count: 0,
      name: "test",
      reset: () => set({ count: 0, name: "test" }),
      incrementBy: (n: number) => set({ count: get().count + n }),
      getName: () => get().name
    }));
    
    store.count.value = 10;
    store.name.value = "updated";
    
    expect(store.count.value).toBe(10);
    expect(store.getName()).toBe("updated");
    
    store.incrementBy(5);
    expect(store.count.value).toBe(15);
    
    store.reset();
    expect(store.count.value).toBe(0);
    expect(store.name.value).toBe("test");
  });

  test("should handle circular references in state", () => {
    interface CircularState {
      value: number;
      self?: CircularState;
    }
    
    const circularObj: CircularState = { value: 1 };
    circularObj.self = circularObj;
    
    const store = createStore(() => ({ circular: circularObj }));
    
    expect(store.circular.value.value).toBe(1);
    expect(store.circular.value.self).toBe(circularObj);
  });

  test("should handle Map and Set in state", () => {
    const store = createStore(() => ({
      map: new Map([["key", "value"]]),
      set: new Set([1, 2, 3])
    }));
    
    expect(store.map.value.get("key")).toBe("value");
    expect(store.set.value.has(2)).toBe(true);
    
    const newMap = new Map([["newKey", "newValue"]]);
    store.map.value = newMap;
    
    expect(store.map.value.get("newKey")).toBe("newValue");
  });

  test("should handle Date objects in state", () => {
    const date = new Date("2024-01-01");
    const store = createStore(() => ({ date }));
    
    expect(store.date.value).toBe(date);
    expect(store.date.value.getFullYear()).toBe(2024);
  });

  test("should handle Symbol values in state", () => {
    const sym = Symbol("test");
    const store = createStore(() => ({ symbol: sym }));
    
    expect(store.symbol.value).toBe(sym);
  });

  test("should handle BigInt values in state", () => {
    const store = createStore(() => ({ big: BigInt(123456789) }));
    
    expect(store.big.value).toBe(BigInt(123456789));
    
    store.big.value = BigInt(987654321);
    expect(store.big.value).toBe(BigInt(987654321));
  });

  test("should handle class instances in state", () => {
    class User {
      constructor(public name: string, public age: number) {}
      greet() {
        return `Hello, ${this.name}`;
      }
    }
    
    const user = new User("Alice", 30);
    const store = createStore(() => ({ user }));
    
    expect(store.user.value).toBe(user);
    expect(store.user.value.greet()).toBe("Hello, Alice");
  });
});

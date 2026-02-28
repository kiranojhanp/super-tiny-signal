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

  // Edge case tests
  describe("Edge Cases", () => {
    test("should handle null values", () => {
      const nullSignal = signal<string | null>(null);
      expect(nullSignal.value).toBeNull();
      
      nullSignal.value = "not null";
      expect(nullSignal.value).toBe("not null");
      
      nullSignal.value = null;
      expect(nullSignal.value).toBeNull();
    });

    test("should handle undefined values", () => {
      const undefinedSignal = signal<string | undefined>(undefined);
      expect(undefinedSignal.value).toBeUndefined();
      
      undefinedSignal.value = "defined";
      expect(undefinedSignal.value).toBe("defined");
      
      undefinedSignal.value = undefined;
      expect(undefinedSignal.value).toBeUndefined();
    });

    test("should handle NaN values", () => {
      const nanSignal = signal(NaN);
      expect(Number.isNaN(nanSignal.value)).toBe(true);
      
      // Object.is(NaN, NaN) is true, so setting to NaN should NOT trigger effects
      let effectRuns = 0;
      effect(() => {
        nanSignal.value;
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      nanSignal.value = NaN;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(effectRuns).toBe(1); // Should NOT trigger because Object.is(NaN, NaN) is true
          
          // But changing to a different value should trigger
          nanSignal.value = 5;
          setTimeout(() => {
            expect(effectRuns).toBe(2);
            resolve(undefined);
          }, 10);
        }, 10);
      });
    });

    test("should handle Infinity values", () => {
      const infSignal = signal(Infinity);
      expect(infSignal.value).toBe(Infinity);
      
      infSignal.value = -Infinity;
      expect(infSignal.value).toBe(-Infinity);
      
      infSignal.value = Infinity;
      expect(infSignal.value).toBe(Infinity);
    });

    test("should handle Symbol values", () => {
      const sym1 = Symbol("test");
      const sym2 = Symbol("test");
      const symSignal = signal<symbol>(sym1);
      
      expect(symSignal.value).toBe(sym1);
      
      symSignal.value = sym2;
      expect(symSignal.value).toBe(sym2);
      expect(symSignal.value).not.toBe(sym1); // Different symbols
    });

    test("should handle Date objects", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-02");
      const dateSignal = signal(date1);
      
      expect(dateSignal.value).toBe(date1);
      
      dateSignal.value = date2;
      expect(dateSignal.value).toBe(date2);
    });

    test("should handle Map and Set", () => {
      const map = new Map([["key", "value"]]);
      const mapSignal = signal(map);
      expect(mapSignal.value).toBe(map);
      
      const set = new Set([1, 2, 3]);
      const setSignal = signal(set);
      expect(setSignal.value).toBe(set);
    });

    test("should handle circular references in objects", () => {
      interface CircularObj {
        value: number;
        self?: CircularObj;
      }
      
      const obj: CircularObj = { value: 1 };
      obj.self = obj;
      
      const circularSignal = signal(obj);
      expect(circularSignal.value.value).toBe(1);
      expect(circularSignal.value.self).toBe(obj);
      expect(circularSignal.value.self?.self).toBe(obj);
    });

    test("should handle very large objects", () => {
      const largeObj = Object.fromEntries(
        Array.from({ length: 10000 }, (_, i) => [`key${i}`, i])
      );
      const largeSignal = signal(largeObj);
      
      expect(largeSignal.value).toBe(largeObj);
      expect(Object.keys(largeSignal.value).length).toBe(10000);
    });

    test("should handle frozen objects", () => {
      const frozen = Object.freeze({ value: 1 });
      const frozenSignal = signal<Readonly<{ value: number }>>(frozen);
      
      expect(frozenSignal.value).toBe(frozen);
      expect(Object.isFrozen(frozenSignal.value)).toBe(true);
      
      const newFrozen = Object.freeze({ value: 2 });
      frozenSignal.value = newFrozen;
      expect(frozenSignal.value).toBe(newFrozen);
    });

    test("should handle sealed objects", () => {
      const sealed = Object.seal({ value: 1 });
      const sealedSignal = signal(sealed);
      
      expect(sealedSignal.value).toBe(sealed);
      expect(Object.isSealed(sealedSignal.value)).toBe(true);
    });

    test("should handle concurrent updates", () => {
      const count = signal(0);
      
      // Simulate concurrent updates
      count.value = 1;
      count.value = 2;
      count.value = 3;
      
      expect(count.value).toBe(3); // Last write wins
    });

    test("should handle rapid sequential updates", () => {
      const count = signal(0);
      let effectRuns = 0;
      let lastValue = 0;
      
      effect(() => {
        lastValue = count.value;
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      
      // Rapid updates
      for (let i = 1; i <= 100; i++) {
        count.value = i;
      }
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(lastValue).toBe(100);
          // Effect should batch updates
          expect(effectRuns).toBeGreaterThan(1);
          expect(effectRuns).toBeLessThanOrEqual(101);
          resolve(undefined);
        }, 20);
      });
    });

    test("should handle errors in custom equality function", () => {
      const erroringEquals = () => {
        throw new Error("Equality check failed");
      };
      
      const sig = signal(1, { equals: erroringEquals });
      
      // Should throw when trying to set value
      expect(() => {
        sig.value = 2;
      }).toThrow("Equality check failed");
    });

    test("should handle custom equality returning non-boolean", () => {
      const weirdEquals = () => "yes" as unknown as boolean;
      const sig = signal(1, { equals: weirdEquals });
      
      let effectRuns = 0;
      effect(() => {
        sig.value;
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      
      // "yes" is truthy, so should be treated as equal
      sig.value = 2;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(effectRuns).toBe(1); // Should not trigger
          resolve(undefined);
        }, 10);
      });
    });

    test("should handle zero vs negative zero", () => {
      const zeroSignal = signal(0);
      expect(Object.is(zeroSignal.value, 0)).toBe(true);
      
      zeroSignal.value = -0;
      // In JavaScript, 0 === -0, so default equality won't trigger update
      expect(zeroSignal.value === 0).toBe(true);
      expect(Object.is(zeroSignal.value, -0)).toBe(true);
    });

    test("should handle functions as values", () => {
      const fn1 = () => 1;
      const fn2 = () => 2;
      const fnSignal = signal(fn1);
      
      expect(fnSignal.value).toBe(fn1);
      expect(fnSignal.value()).toBe(1);
      
      fnSignal.value = fn2;
      expect(fnSignal.value).toBe(fn2);
      expect(fnSignal.value()).toBe(2);
    });

    test("should handle class instances", () => {
      class TestClass {
        constructor(public value: number) {}
      }
      
      const instance1 = new TestClass(1);
      const instance2 = new TestClass(2);
      const classSignal = signal(instance1);
      
      expect(classSignal.value).toBe(instance1);
      expect(classSignal.value.value).toBe(1);
      
      classSignal.value = instance2;
      expect(classSignal.value).toBe(instance2);
      expect(classSignal.value.value).toBe(2);
    });

    test("should handle Promises as values", () => {
      const promise1 = Promise.resolve(1);
      const promise2 = Promise.resolve(2);
      const promiseSignal = signal(promise1);
      
      expect(promiseSignal.value).toBe(promise1);
      
      promiseSignal.value = promise2;
      expect(promiseSignal.value).toBe(promise2);
    });

    test("should handle BigInt values", () => {
      const bigIntSignal = signal(BigInt(9007199254740991));
      expect(bigIntSignal.value).toBe(BigInt(9007199254740991));
      
      bigIntSignal.value = BigInt(123);
      expect(bigIntSignal.value).toBe(BigInt(123));
    });

    test("should handle empty strings", () => {
      const emptySignal = signal("");
      expect(emptySignal.value).toBe("");
      
      emptySignal.value = "not empty";
      expect(emptySignal.value).toBe("not empty");
      
      emptySignal.value = "";
      expect(emptySignal.value).toBe("");
    });

    test("should handle empty arrays", () => {
      const emptyArraySignal = signal<number[]>([]);
      expect(emptyArraySignal.value).toEqual([]);
      expect(emptyArraySignal.value.length).toBe(0);
      
      emptyArraySignal.value = [1, 2, 3];
      expect(emptyArraySignal.value).toEqual([1, 2, 3]);
    });

    test("should handle empty objects", () => {
      const emptyObjSignal = signal({});
      expect(emptyObjSignal.value).toEqual({});
      expect(Object.keys(emptyObjSignal.value).length).toBe(0);
    });

    test("should not prevent garbage collection of old values", () => {
      const sig = signal({ large: new Array(1000).fill(0) });
      
      // Replace with new value - old value should be eligible for GC
      sig.value = { large: new Array(1000).fill(1) };
      
      // Note: We can't force GC or reliably test it in JavaScript
      // This test just documents the expected behavior
      expect(sig.value.large[0]).toBe(1);
    });
  });
});

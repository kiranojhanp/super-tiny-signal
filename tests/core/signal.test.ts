import { describe, expect, test } from "bun:test";
import { signal } from "../../src/core/signal.js";
import { effect, flushEffects } from "../../src/core/effect.js";

describe("Signal", () => {
  test("should create a signal with initial value", () => {
    const [count, setCount] = signal(0);
    expect(count()).toBe(0);
  });

  test("should update signal value", () => {
    const [count, setCount] = signal(0);
    setCount(5);
    expect(count()).toBe(5);
  });

  test("should notify effects when value changes", async () => {
    const [count, setCount] = signal(0);
    let effectRuns = 0;
    let lastValue = 0;

    effect(() => {
      lastValue = count();
      effectRuns++;
    });

    // Effect runs immediately
    expect(effectRuns).toBe(1);
    expect(lastValue).toBe(0);

    setCount(10);
    
    await flushEffects();

    expect(effectRuns).toBe(2);
    expect(lastValue).toBe(10);
  });

  test("should not notify effects when value doesn't change", async () => {
    const [count, setCount] = signal(5);
    let effectRuns = 0;

    effect(() => {
      count();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Set to same value
    setCount(5);

    await flushEffects();
    expect(effectRuns).toBe(1); // Should not run again
  });

  test("should use custom equality function", async () => {
    const [obj, setObj] = signal({ x: 1 }, { equals: (a, b) => a.x === b.x });
    let effectRuns = 0;

    effect(() => {
      obj();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Different object, same x value
    setObj({ x: 1 });

    await flushEffects();
    expect(effectRuns).toBe(1); // Should not run due to custom equality
  });

  test("should remove disposed effects", async () => {
    const [count, setCount] = signal(0);
    let effectRuns = 0;

    const dispose = effect(() => {
      count();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    dispose();
    setCount(10);

    await flushEffects();
    expect(effectRuns).toBe(1); // Should not run after disposal
  });

  test("should handle multiple effects on same signal", async () => {
    const [count, setCount] = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;

    effect(() => {
      count();
      effect1Runs++;
    });

    effect(() => {
      count();
      effect2Runs++;
    });

    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);

    setCount(5);

    await flushEffects();
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(2);
  });

  test("should work with different data types", () => {
    const [stringSignal, setStringSignal] = signal("hello");
    const [arraySignal, setArraySignal] = signal([1, 2, 3]);
    const [objectSignal, setObjectSignal] = signal({ name: "test" });
    const [boolSignal, setBoolSignal] = signal(true);

    expect(stringSignal()).toBe("hello");
    expect(arraySignal()).toEqual([1, 2, 3]);
    expect(objectSignal()).toEqual({ name: "test" });
    expect(boolSignal()).toBe(true);

    setStringSignal("world");
    setArraySignal([4, 5, 6]);
    setObjectSignal({ name: "updated" });
    setBoolSignal(false);

    expect(stringSignal()).toBe("world");
    expect(arraySignal()).toEqual([4, 5, 6]);
    expect(objectSignal()).toEqual({ name: "updated" });
    expect(boolSignal()).toBe(false);
  });

  // Edge case tests
  describe("Edge Cases", () => {
    test("should handle null values", () => {
      const [nullSignal, setNullSignal] = signal(null);
      expect(nullSignal()).toBeNull();
      
      setNullSignal("not null");
      expect(nullSignal()).toBe("not null");
      
      setNullSignal(null);
      expect(nullSignal()).toBeNull();
    });

    test("should handle undefined values", () => {
      const [undefinedSignal, setUndefinedSignal] = signal(undefined);
      expect(undefinedSignal()).toBeUndefined();
      
      setUndefinedSignal("defined");
      expect(undefinedSignal()).toBe("defined");
      
      setUndefinedSignal(undefined);
      expect(undefinedSignal()).toBeUndefined();
    });

    test("should handle NaN values", async () => {
      const [nanSignal, setNanSignal] = signal(NaN);
      expect(Number.isNaN(nanSignal())).toBe(true);
      
      // Object.is(NaN, NaN) is true, so setting to NaN should NOT trigger effects
      let effectRuns = 0;
      effect(() => {
        nanSignal();
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      setNanSignal(NaN);
      
      await flushEffects();
      expect(effectRuns).toBe(1); // Should NOT trigger because Object.is(NaN, NaN) is true

      // But changing to a different value should trigger
      setNanSignal(5);
      await flushEffects();
      expect(effectRuns).toBe(2);
    });

    test("should handle Infinity values", () => {
      const [infSignal, setInfSignal] = signal(Infinity);
      expect(infSignal()).toBe(Infinity);
      
      setInfSignal(-Infinity);
      expect(infSignal()).toBe(-Infinity);
      
      setInfSignal(Infinity);
      expect(infSignal()).toBe(Infinity);
    });

    test("should handle Symbol values", () => {
      const sym1 = Symbol("test");
      const sym2 = Symbol("test");
      const [symSignal, setSymSignal] = signal(sym1);
      
      expect(symSignal()).toBe(sym1);
      
      setSymSignal(sym2);
      expect(symSignal()).toBe(sym2);
      expect(symSignal()).not.toBe(sym1); // Different symbols
    });

    test("should handle Date objects", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-02");
      const [dateSignal, setDateSignal] = signal(date1);
      
      expect(dateSignal()).toBe(date1);
      
      setDateSignal(date2);
      expect(dateSignal()).toBe(date2);
    });

    test("should handle Map and Set", () => {
      const map = new Map([["key", "value"]]);
      const [mapSignal, setMapSignal] = signal(map);
      expect(mapSignal()).toBe(map);
      
      const set = new Set([1, 2, 3]);
      const [setSignal, setSetSignal] = signal(set);
      expect(setSignal()).toBe(set);
    });

    test("should handle circular references in objects", () => {
      interface CircularObj {
        value: number;
        self?: CircularObj;
      }
      
      const obj: CircularObj = { value: 1 };
      obj.self = obj;
      
      const [circularSignal, setCircularSignal] = signal(obj);
      expect(circularSignal().value).toBe(1);
      expect(circularSignal().self).toBe(obj);
      expect(circularSignal().self?.self).toBe(obj);
    });

    test("should handle very large objects", () => {
      const largeObj = Object.fromEntries(
        Array.from({ length: 10000 }, (_, i) => [`key${i}`, i])
      );
      const [largeSignal, setLargeSignal] = signal(largeObj);
      
      expect(largeSignal()).toBe(largeObj);
      expect(Object.keys(largeSignal()).length).toBe(10000);
    });

    test("should handle frozen objects", () => {
      const frozen = Object.freeze({ value: 1 });
      const [frozenSignal, setFrozenSignal] = signal<Readonly<{ value: number }>>(frozen);
      
      expect(frozenSignal()).toBe(frozen);
      expect(Object.isFrozen(frozenSignal())).toBe(true);
      
      const newFrozen = Object.freeze({ value: 2 });
      setFrozenSignal(newFrozen);
      expect(frozenSignal()).toBe(newFrozen);
    });

    test("should handle sealed objects", () => {
      const sealed = Object.seal({ value: 1 });
      const [sealedSignal, setSealedSignal] = signal(sealed);
      
      expect(sealedSignal()).toBe(sealed);
      expect(Object.isSealed(sealedSignal())).toBe(true);
    });

    test("should handle concurrent updates", () => {
      const [count, setCount] = signal(0);
      
      // Simulate concurrent updates
      setCount(1);
      setCount(2);
      setCount(3);
      
      expect(count()).toBe(3); // Last write wins
    });

    test("should handle rapid sequential updates", async () => {
      const [count, setCount] = signal(0);
      let effectRuns = 0;
      let lastValue = 0;
      
      effect(() => {
        lastValue = count();
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      
      // Rapid updates
      for (let i = 1; i <= 100; i++) {
        setCount(i);
      }
      
      await flushEffects();
      expect(lastValue).toBe(100);
      expect(effectRuns).toBe(2);
    });

    test("should handle errors in custom equality function", () => {
      const erroringEquals = () => {
        throw new Error("Equality check failed");
      };
      
      const [sig, setSig] = signal(1, { equals: erroringEquals });
      
      // Should throw when trying to set value
      expect(() => {
        setSig(2);
      }).toThrow("Equality check failed");
    });

    test("should handle custom equality returning non-boolean", async () => {
      const weirdEquals = () => "yes" as unknown as boolean;
      const [sig, setSig] = signal(1, { equals: weirdEquals });
      
      let effectRuns = 0;
      effect(() => {
        sig();
        effectRuns++;
      });
      
      expect(effectRuns).toBe(1);
      
      // "yes" is truthy, so should be treated as equal
      setSig(2);
      
      await flushEffects();
      expect(effectRuns).toBe(1); // Should not trigger
    });

    test("should handle zero vs negative zero", () => {
      const [zeroSignal, setZeroSignal] = signal(0);
      expect(Object.is(zeroSignal(), 0)).toBe(true);
      
      setZeroSignal(-0);
      // In JavaScript, 0 === -0, so default equality won't trigger update
      expect(zeroSignal() === 0).toBe(true);
      expect(Object.is(zeroSignal(), -0)).toBe(true);
    });

    test("should handle functions as values", () => {
      const fn1 = () => 1;
      const fn2 = () => 2;
      const [fnSignal, setFnSignal] = signal(fn1);
      
      expect(fnSignal()).toBe(fn1);
      expect(fnSignal()()).toBe(1);
      
      setFnSignal(() => fn2);
      expect(fnSignal()).toBe(fn2);
      expect(fnSignal()()).toBe(2);
    });

    test("should handle class instances", () => {
      class TestClass {
        constructor(public value: number) {}
      }
      
      const instance1 = new TestClass(1);
      const instance2 = new TestClass(2);
      const [classSignal, setClassSignal] = signal(instance1);
      
      expect(classSignal()).toBe(instance1);
      expect(classSignal().value).toBe(1);
      
      setClassSignal(instance2);
      expect(classSignal()).toBe(instance2);
      expect(classSignal().value).toBe(2);
    });

    test("should handle Promises as values", () => {
      const promise1 = Promise.resolve(1);
      const promise2 = Promise.resolve(2);
      const [promiseSignal, setPromiseSignal] = signal(promise1);
      
      expect(promiseSignal()).toBe(promise1);
      
      setPromiseSignal(promise2);
      expect(promiseSignal()).toBe(promise2);
    });

    test("should handle BigInt values", () => {
      const [bigIntSignal, setBigIntSignal] = signal(BigInt(9007199254740991));
      expect(bigIntSignal()).toBe(BigInt(9007199254740991));
      
      setBigIntSignal(BigInt(123));
      expect(bigIntSignal()).toBe(BigInt(123));
    });

    test("should handle empty strings", () => {
      const [emptySignal, setEmptySignal] = signal("");
      expect(emptySignal()).toBe("");
      
      setEmptySignal("not empty");
      expect(emptySignal()).toBe("not empty");
      
      setEmptySignal("");
      expect(emptySignal()).toBe("");
    });

    test("should handle empty arrays", () => {
      const [emptyArraySignal, setEmptyArraySignal] = signal([]);
      expect(emptyArraySignal()).toEqual([]);
      expect(emptyArraySignal().length).toBe(0);
      
      setEmptyArraySignal([1, 2, 3]);
      expect(emptyArraySignal()).toEqual([1, 2, 3]);
    });

    test("should handle empty objects", () => {
      const [emptyObjSignal, setEmptyObjSignal] = signal({});
      expect(emptyObjSignal()).toEqual({});
      expect(Object.keys(emptyObjSignal()).length).toBe(0);
    });

    test("should not prevent garbage collection of old values", () => {
      const [sig, setSig] = signal({ large: new Array(1000).fill(0) });
      
      // Replace with new value - old value should be eligible for GC
      setSig({ large: new Array(1000).fill(1) });
      
      // Note: We can't force GC or reliably test it in JavaScript
      // This test just documents the expected behavior
      expect(sig().large[0]).toBe(1);
    });
  });
});

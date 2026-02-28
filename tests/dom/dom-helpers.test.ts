import { describe, expect, test } from "bun:test";

import { signal } from "../../src/core/signal.js";
import { flushEffects } from "../../src/core/effect.js";
import { bindText } from "../../src/dom/bindText.js";
import { bindAttr } from "../../src/dom/bindAttr.js";
import { on } from "../../src/dom/on.js";

type FakeNodeList = {
  length: number;
  item(index: number): Node | null;
};

function createNodeList(nodes: Node[] = []): FakeNodeList {
  return {
    length: nodes.length,
    item(index: number) {
      return nodes[index] ?? null;
    },
  };
}

function createMutationRecord(removedNodes: Node[]): MutationRecord {
  return {
    addedNodes: createNodeList() as unknown as NodeList,
    attributeName: null,
    attributeNamespace: null,
    nextSibling: null,
    oldValue: null,
    previousSibling: null,
    removedNodes: createNodeList(removedNodes) as unknown as NodeList,
    target: {} as Node,
    type: "childList",
  } as MutationRecord;
}

function withMockedMutationObserver(run: (trigger: (removed: Node[]) => void) => void): void {
  const originalObserver = globalThis.MutationObserver;
  const originalDocument = globalThis.document;

  let callback: MutationCallback = () => {};

  class MockMutationObserver {
    constructor(cb: MutationCallback) {
      callback = cb;
    }

    observe(): void {}
    disconnect(): void {}
    takeRecords(): MutationRecord[] {
      return [];
    }
  }

  (globalThis as unknown as { MutationObserver: typeof MutationObserver }).MutationObserver =
    MockMutationObserver as unknown as typeof MutationObserver;
  (globalThis as unknown as { document: Document }).document = {
    documentElement: {} as Element,
  } as Document;

  try {
    run((removed) => {
      callback([createMutationRecord(removed)], {} as MutationObserver);
    });
  } finally {
    if (originalObserver) {
      (globalThis as unknown as { MutationObserver: typeof MutationObserver }).MutationObserver =
        originalObserver;
    } else {
      delete (globalThis as unknown as { MutationObserver?: typeof MutationObserver })
        .MutationObserver;
    }

    if (originalDocument) {
      (globalThis as unknown as { document: Document }).document = originalDocument;
    } else {
      delete (globalThis as unknown as { document?: Document }).document;
    }
  }
}

describe("dom helpers", () => {
  test("bindText updates node text from signal getter", async () => {
    const [count, setCount] = signal(0);
    const node = {
      textContent: "",
      childNodes: createNodeList(),
    } as unknown as Node;

    const dispose = bindText(node, () => `Count ${count()}`);
    expect((node as { textContent: string }).textContent).toBe("Count 0");

    setCount(3);
    await flushEffects();
    expect((node as { textContent: string }).textContent).toBe("Count 3");

    dispose();
    setCount(5);
    await flushEffects();
    expect((node as { textContent: string }).textContent).toBe("Count 3");
  });

  test("bindAttr applies and removes attributes", async () => {
    const [active, setActive] = signal(false);
    const attrs = new Map<string, string>();
    const element = {
      childNodes: createNodeList(),
      setAttribute(name: string, value: string) {
        attrs.set(name, value);
      },
      removeAttribute(name: string) {
        attrs.delete(name);
      },
    } as unknown as Element;

    bindAttr(element, "data-active", () => (active() ? "yes" : null));
    expect(attrs.has("data-active")).toBe(false);

    setActive(true);
    await flushEffects();
    expect(attrs.get("data-active")).toBe("yes");

    setActive(false);
    await flushEffects();
    expect(attrs.has("data-active")).toBe(false);
  });

  test("on wires and unwires typed event listeners", () => {
    let clickListener: ((event: Event) => void) | null = null;
    let clicks = 0;

    const element = {
      addEventListener(_type: string, listener: EventListener) {
        clickListener = listener as (event: Event) => void;
      },
      removeEventListener(_type: string, listener: EventListener) {
        if (clickListener === listener) clickListener = null;
      },
    } as unknown as HTMLElement;

    const dispose = on(element, "click", (event) => {
      expect(event.type).toBe("click");
      clicks++;
    });

    expect(clickListener).not.toBeNull();
    (clickListener as ((event: Event) => void) | null)?.({ type: "click" } as Event);
    expect(clicks).toBe(1);

    dispose();
    expect(clickListener).toBeNull();
  });

  test("node cleanup continues when one disposer throws", () => {
    withMockedMutationObserver((triggerRemoved) => {
      let removeAttempts = 0;

      const element = {
        addEventListener() {},
        removeEventListener() {
          removeAttempts++;
          if (removeAttempts === 1) {
            throw new Error("remove failed");
          }
        },
        childNodes: createNodeList(),
      } as unknown as HTMLElement;

      on(element, "click", () => {});
      on(element, "click", () => {});

      const originalError = console.error;
      let errorCalls = 0;
      console.error = () => {
        errorCalls++;
      };

      try {
        expect(() => triggerRemoved([element as unknown as Node])).not.toThrow();
      } finally {
        console.error = originalError;
      }

      expect(removeAttempts).toBe(2);
      expect(errorCalls).toBe(1);
    });
  });

  test("on does not remove listener twice after manual dispose", () => {
    withMockedMutationObserver((triggerRemoved) => {
      let removeCalls = 0;

      const element = {
        addEventListener() {},
        removeEventListener() {
          removeCalls++;
        },
        childNodes: createNodeList(),
      } as unknown as HTMLElement;

      const dispose = on(element, "click", () => {});
      dispose();

      triggerRemoved([element as unknown as Node]);
      expect(removeCalls).toBe(1);
    });
  });
});

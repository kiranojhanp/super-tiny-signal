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

describe("dom helpers", () => {
  test("bindText updates node text from callable signal", async () => {
    const count = signal(0);
    const node = {
      textContent: "",
      childNodes: createNodeList(),
    } as unknown as Node;

    const dispose = bindText(node, () => `Count ${count()}`);
    expect((node as { textContent: string }).textContent).toBe("Count 0");

    count(3);
    await flushEffects();
    expect((node as { textContent: string }).textContent).toBe("Count 3");

    dispose();
    count(5);
    await flushEffects();
    expect((node as { textContent: string }).textContent).toBe("Count 3");
  });

  test("bindAttr applies and removes attributes", async () => {
    const active = signal(false);
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

    active(true);
    await flushEffects();
    expect(attrs.get("data-active")).toBe("yes");

    active(false);
    await flushEffects();
    expect(attrs.has("data-active")).toBe(false);
  });

  test("on wires and unwires typed event listeners", () => {
    let clickListener: EventListener | null = null;
    let clicks = 0;

    const element = {
      addEventListener(_type: string, listener: EventListener) {
        clickListener = listener;
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
    clickListener?.({ type: "click" } as Event);
    expect(clicks).toBe(1);

    dispose();
    expect(clickListener).toBeNull();
  });
});

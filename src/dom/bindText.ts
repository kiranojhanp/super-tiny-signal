import { effect } from "../core/effect.js";

export function bindText(node: Node, read: () => unknown): () => void {
  return effect(() => {
    node.textContent = String(read() ?? "");
  }, node);
}

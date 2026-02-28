import type { Dispose } from "../types/index.js";

const cleanupByNode = new WeakMap<Node, Set<Dispose>>();

let observer: MutationObserver | null = null;

function cleanupNode(node: Node): void {
  const disposers = cleanupByNode.get(node);
  if (disposers) {
    for (const dispose of Array.from(disposers)) {
      try {
        dispose();
      } catch (error) {
        console.error("Error during node cleanup:", error);
      }
    }
    cleanupByNode.delete(node);
  }

  for (let index = 0; index < node.childNodes.length; index++) {
    const child = node.childNodes.item(index);
    if (child) cleanupNode(child);
  }
}

function ensureObserver(): void {
  if (
    observer ||
    typeof MutationObserver === "undefined" ||
    typeof document === "undefined" ||
    !document.documentElement
  ) {
    return;
  }

  observer = new MutationObserver((records) => {
    for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
      const record = records[recordIndex];
      for (
        let nodeIndex = 0;
        nodeIndex < record.removedNodes.length;
        nodeIndex++
      ) {
        const removedNode = record.removedNodes.item(nodeIndex);
        if (removedNode) cleanupNode(removedNode);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export function registerNodeCleanup(node: Node, dispose: Dispose): Dispose {
  let disposers = cleanupByNode.get(node);
  if (!disposers) {
    disposers = new Set();
    cleanupByNode.set(node, disposers);
  }
  disposers.add(dispose);

  ensureObserver();

  return () => {
    const nodeDisposers = cleanupByNode.get(node);
    if (!nodeDisposers) return;
    nodeDisposers.delete(dispose);
    if (nodeDisposers.size === 0) {
      cleanupByNode.delete(node);
    }
  };
}

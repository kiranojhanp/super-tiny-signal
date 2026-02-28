import { registerNodeCleanup } from "./scopeCleanup.js";

export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  let disposed = false;

  const listener: EventListener = (event) => {
    handler(event as HTMLElementEventMap[K]);
  };

  element.addEventListener(type, listener, options);

  let unregister = () => {};

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    unregister();
    element.removeEventListener(type, listener, options);
  };

  unregister = registerNodeCleanup(element, dispose);
  return dispose;
}

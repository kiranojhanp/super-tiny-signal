import { registerNodeCleanup } from "./scopeCleanup.js";

export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  const listener: EventListener = (event) => {
    handler(event as HTMLElementEventMap[K]);
  };

  element.addEventListener(type, listener, options);

  const dispose = () => {
    element.removeEventListener(type, listener, options);
  };

  registerNodeCleanup(element, dispose);
  return dispose;
}

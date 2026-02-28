import { effect } from "../core/effect.js";

type AttrValue = string | number | boolean | null | undefined;

export function bindAttr(
  element: Element,
  name: string,
  read: () => AttrValue
): () => void {
  return effect(() => {
    const value = read();
    if (value == null || value === false) {
      element.removeAttribute(name);
      return;
    }
    element.setAttribute(name, value === true ? "" : String(value));
  }, element);
}

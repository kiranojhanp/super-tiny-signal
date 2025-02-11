import { effect } from "./core";

/**
 * render(container, renderFn)
 *
 * Runs renderFn (which should return an array of DOM nodes) on every reactive update,
 * replacing the container’s contents.
 */
export function render(container: HTMLElement, renderFn: () => Node[]): void {
  effect(() => {
    const nodes = renderFn();
    container.innerHTML = "";
    container.append(...nodes);
  });
}

/**
 * html – A tagged template literal that converts HTML strings into DOM nodes.
 * Supports inline event handlers using the syntax: on:click=${handler}
 */
export function html(strings: TemplateStringsArray, ...values: any[]): Node[] {
  let result = "";
  const events: {
    placeholder: string;
    eventName: string;
    handler: EventListener;
  }[] = [];
  let eventCounter = 0;

  for (let i = 0; i < strings.length; i++) {
    let segment = strings[i];
    const eventAttrRegex = /on:([a-z]+)=$/i;
    const match = segment.match(eventAttrRegex);
    if (match) {
      // Remove "on:event=" from the segment.
      segment = segment.slice(0, -match[0].length);
      result += segment;
      const eventName = match[1];
      const handler = values[i] as EventListener;
      const placeholder = `__event_${eventCounter}__`;
      result += `"${placeholder}"`;
      events.push({ placeholder, eventName, handler });
      eventCounter++;
    } else {
      result += segment;
      if (i < values.length) {
        result += values[i];
      }
    }
  }

  // Create a template element and set its innerHTML.
  const template = document.createElement("template");
  template.innerHTML = result;

  // Attach event listeners for placeholders.
  events.forEach(({ placeholder, eventName, handler }) => {
    const walker = document.createTreeWalker(
      template.content,
      NodeFilter.SHOW_ELEMENT
    );
    let node = walker.nextNode() as HTMLElement | null;
    while (node) {
      for (const attr of Array.from(node.attributes)) {
        if (attr.value === placeholder) {
          node.removeAttribute(attr.name);
          node.addEventListener(eventName, handler);
        }
      }
      node = walker.nextNode() as HTMLElement | null;
    }
  });

  return Array.from(template.content.childNodes);
}

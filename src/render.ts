import { Signal, effect } from "./core";

type BindingType = "text" | "attr" | "event";

interface Binding {
  type: BindingType;
  index: number;
}

/**
 * Examine the literal that comes *before* an interpolation to decide what kind
 * of binding to create.
 */
function determineBindingType(preceding: string): BindingType {
  // If the literal ends with an event attribute (e.g. onclick=, onmouseover=, etc.)
  if (/on\w+\s*=\s*["']?$/.test(preceding)) {
    return "event";
  }
  // Else if it looks like it is inside an attribute assignment, e.g. src=, alt=, etc.
  if (/\w+\s*=\s*["']?$/.test(preceding)) {
    return "attr";
  }
  // Otherwise, assume it’s in plain text.
  return "text";
}

/**
 * The `html` tag literal helper.
 *
 * It supports three binding types:
 * 1. Text bindings (when a placeholder appears in text content).
 * 2. Event bindings (when a placeholder appears as an event attribute value).
 * 3. Attribute bindings (for any other attribute placeholders).
 */
export function html(
  strings: TemplateStringsArray,
  ...values: any[]
): DocumentFragment {
  let htmlString = "";
  const bindings: Binding[] = [];

  // Build the HTML string, inserting markers for each dynamic expression.
  for (let i = 0; i < strings.length; i++) {
    const literal = strings[i];
    htmlString += literal;
    if (i < values.length) {
      const type = determineBindingType(literal);
      bindings.push({ type, index: i });
      // Insert a marker token based on the binding type.
      if (type === "text") {
        // Use a comment marker for text so that we can find it in the tree.
        htmlString += `<!--marker:${i}:text-->`;
      } else if (type === "event") {
        // Insert a unique token for event listener bindings.
        htmlString += `__event_marker_${i}__`;
      } else if (type === "attr") {
        // Insert a unique token for attribute bindings.
        htmlString += `__attr_marker_${i}__`;
      }
    }
  }

  // Parse the HTML string into a DocumentFragment.
  const template = document.createElement("template");
  template.innerHTML = htmlString;
  const fragment = template.content;

  // ============
  // 1. Text Bindings
  // ============
  // Use a TreeWalker to find comment nodes that serve as markers.
  const walker = document.createTreeWalker(
    fragment,
    NodeFilter.SHOW_COMMENT,
    null
  );
  let comment: Comment | null;
  while ((comment = walker.nextNode() as Comment | null)) {
    const markerMatch = comment.nodeValue?.match(/^marker:(\d+):text$/);
    if (markerMatch) {
      const idx = parseInt(markerMatch[1], 10);
      const bindingValue = values[idx];
      let node: Node;
      if (bindingValue && bindingValue instanceof Signal) {
        // Create a text node with the initial value and bind updates.
        node = document.createTextNode(bindingValue.peek());
        effect(() => {
          node.textContent = String(bindingValue.value);
        });
      } else {
        // For non-signal values, just create a text node.
        node = document.createTextNode(String(bindingValue));
      }
      comment.parentNode?.replaceChild(node, comment);
    }
  }

  // ============
  // 2. Attribute & Event Bindings
  // ============
  // Iterate over all elements in the fragment.
  const elements = fragment.querySelectorAll("*");
  elements.forEach((el) => {
    // Loop through each attribute on the element.
    for (const attr of Array.from(el.attributes)) {
      const { name, value: attrValue } = attr;
      // Check for an event listener marker.
      const eventMarkerMatch = attrValue.match(/^__event_marker_(\d+)__$/);
      if (eventMarkerMatch) {
        const idx = parseInt(eventMarkerMatch[1], 10);
        const bindingValue = values[idx];
        // Remove the attribute so that it doesn’t get processed as plain text.
        el.removeAttribute(name);
        // If the value is a function, add it as an event listener.
        if (typeof bindingValue === "function") {
          // Derive the event name by stripping the leading "on" (e.g., "onclick" → "click").
          const eventType = name.slice(2);
          el.addEventListener(eventType, bindingValue);
        }
        continue; // Move on to the next attribute.
      }
      // Check for a generic attribute marker.
      const attrMarkerMatch = attrValue.match(/^__attr_marker_(\d+)__$/);
      if (attrMarkerMatch) {
        const idx = parseInt(attrMarkerMatch[1], 10);
        const bindingValue = values[idx];
        // If the binding value is a Signal, set up an effect for automatic updates.
        if (bindingValue && bindingValue instanceof Signal) {
          effect(() => {
            el.setAttribute(name, String(bindingValue.value));
          });
        } else {
          // Otherwise, simply set the attribute.
          el.setAttribute(name, String(bindingValue));
        }
      }
    }
  });

  return fragment;
}

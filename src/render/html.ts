import { effect } from "../core/effect.js";
import { Signal } from "../core/signal.js";
import { BindingType } from "../types";

/**
 * Determines the binding type for an interpolation based on the literal
 * preceding it.
 *
 * @param preceding The literal string preceding an interpolation.
 * @returns "event" if the literal ends with an event attribute assignment,
 *          "attr" if it looks like an attribute assignment,
 *          or "text" otherwise.
 */
function determineBindingType(preceding: string): BindingType {
  // Matches things like: on<event>= (e.g. onclick=, onmouseover=, etc.)
  const eventAttrRegex = /on\w+\s*=\s*["']?$/;
  if (eventAttrRegex.test(preceding)) {
    return "event";
  }
  // Matches a generic attribute assignment (e.g. src=, alt=, etc.)
  const attrRegex = /\w+\s*=\s*["']?$/;
  if (attrRegex.test(preceding)) {
    return "attr";
  }
  return "text";
}

/**
 * A tagged template literal helper that creates a DocumentFragment
 * from a template string containing dynamic bindings.
 *
 * It supports four binding types:
 * 1. **Text bindings:** when a placeholder appears in text content.
 * 2. **Node bindings:** when a placeholder is a Node (such as a DocumentFragment)
 *    that should be inserted directly.
 * 3. **Event bindings:** when a placeholder appears as an event attribute value.
 * 4. **Attribute bindings:** for any other attribute placeholders.
 *
 * For reactive values (instances of Signal), an effect is registered to update
 * the DOM automatically when the value changes.
 *
 * @param strings The static string portions of the template.
 * @param values The dynamic expressions to interpolate.
 * @returns A DocumentFragment representing the parsed template.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: any[]
): DocumentFragment {
  let htmlString = "";
  // Build the HTML string by interleaving the static parts with unique markers.
  for (let i = 0; i < strings.length; i++) {
    htmlString += strings[i];
    if (i < values.length) {
      const value = values[i];
      // If the value is a Node (or DocumentFragment), insert a node marker.
      if (value instanceof Node) {
        htmlString += `<!--node_marker:${i}-->`;
      } else {
        // Determine the binding type based on the preceding literal.
        const bindingType = determineBindingType(strings[i]);
        if (bindingType === "text") {
          // Use an HTML comment marker for text bindings.
          htmlString += `<!--marker:${i}:text-->`;
        } else if (bindingType === "event") {
          htmlString += `__event_marker_${i}__`;
        } else if (bindingType === "attr") {
          htmlString += `__attr_marker_${i}__`;
        }
      }
    }
  }

  // Convert the HTML string into a DocumentFragment.
  const template = document.createElement("template");
  template.innerHTML = htmlString;
  const fragment = template.content;

  // Recursively process all binding markers in the fragment.
  processBindingsRecursively(fragment, values);

  return fragment;
}

/**
 * Recursively processes binding markers in the given node and its descendants.
 *
 * This function handles:
 * 1. **Text binding markers:** Replaces comments of the form:
 *      <!--marker:{index}:text-->
 *    with a text node containing the corresponding dynamic value.
 *    If the value is a Signal, an effect is created to update the text.
 *
 * 2. **Node binding markers:** Replaces comments of the form:
 *      <!--node_marker:{index}-->
 *    with the corresponding Node from the dynamic values.
 *
 * 3. **Attribute and event binding markers:** For each element, replaces attribute
 *    values that match:
 *      - __event_marker_{index}__ for event bindings.
 *      - __attr_marker_{index}__ for attribute bindings.
 *    For event bindings, if the dynamic value is a function, an event listener is added.
 *    For attribute bindings, if the value is a Signal, an effect is created to update the attribute.
 *
 * @param node The starting node for processing.
 * @param values The dynamic values corresponding to the template expressions.
 */
function processBindingsRecursively(node: Node, values: any[]): void {
  // Process comment nodes for text and node markers.
  if (node.nodeType === Node.COMMENT_NODE) {
    const comment = node as Comment;
    const textMarkerRegex = /^marker:(\d+):text$/;
    const nodeMarkerRegex = /^node_marker:(\d+)$/;
    let match = comment.nodeValue?.match(textMarkerRegex);
    if (match) {
      const idx = parseInt(match[1], 10);
      const bindingValue = values[idx];
      let newNode: Node;
      if (bindingValue instanceof Signal) {
        newNode = document.createTextNode(String(bindingValue.peek()));
        effect(() => {
          newNode.textContent = String(bindingValue.value);
        });
      } else {
        newNode = document.createTextNode(String(bindingValue));
      }
      comment.parentNode?.replaceChild(newNode, comment);
      // Process the newly inserted node recursively.
      processBindingsRecursively(newNode, values);
      return;
    }
    match = comment.nodeValue?.match(nodeMarkerRegex);
    if (match) {
      const idx = parseInt(match[1], 10);
      const bindingValue = values[idx];
      if (bindingValue instanceof Node) {
        comment.parentNode?.replaceChild(bindingValue, comment);
        // Process the inserted node recursively in case it contains markers.
        processBindingsRecursively(bindingValue, values);
      }
      return;
    }
  }

  // Process element nodes for attribute and event markers.
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const eventMarkerRegex = /^__event_marker_(\d+)__$/;
    const attrMarkerRegex = /^__attr_marker_(\d+)__$/;
    for (const attr of Array.from(el.attributes)) {
      const { name, value: attrValue } = attr;
      let match = attrValue.match(eventMarkerRegex);
      if (match) {
        const idx = parseInt(match[1], 10);
        const bindingValue = values[idx];
        el.removeAttribute(name);
        if (typeof bindingValue === "function") {
          // Derive event name by removing the "on" prefix.
          const eventName = name.slice(2);
          el.addEventListener(eventName, bindingValue);
        }
        continue;
      }
      match = attrValue.match(attrMarkerRegex);
      if (match) {
        const idx = parseInt(match[1], 10);
        const bindingValue = values[idx];
        if (bindingValue instanceof Signal) {
          effect(() => {
            el.setAttribute(name, String(bindingValue.value));
          });
        } else {
          el.setAttribute(name, String(bindingValue));
        }
      }
    }
  }

  // Recursively process child nodes.
  // Converting the live NodeList to an array avoids issues with modifications.
  Array.from(node.childNodes).forEach((child) => {
    processBindingsRecursively(child, values);
  });
}

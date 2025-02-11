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
 * It supports three binding types:
 * 1. **Text bindings:** when a placeholder appears in text content.
 * 2. **Event bindings:** when a placeholder appears as an event attribute value.
 * 3. **Attribute bindings:** for any other attribute placeholders.
 *
 * For reactive values (instances of Signal), an effect is registered to
 * update the DOM automatically when the value changes.
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
      const bindingType = determineBindingType(strings[i]);
      // Insert a unique marker depending on the binding type.
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

  // Convert the HTML string into a DocumentFragment.
  const template = document.createElement("template");
  template.innerHTML = htmlString;
  const fragment = template.content;

  processTextBindings(fragment, values);
  processAttrAndEventBindings(fragment, values);

  return fragment;
}

/**
 * Processes all text binding markers (HTML comments) in the given fragment.
 *
 * It replaces each comment marker of the form:
 *
 *     <!--marker:{index}:text-->
 *
 * with a text node containing the corresponding dynamic value. If the value
 * is a Signal then an effect is created to keep the text up-to-date.
 *
 * @param fragment The DocumentFragment to process.
 * @param values The dynamic values corresponding to the template expressions.
 */
function processTextBindings(fragment: DocumentFragment, values: any[]): void {
  const textMarkerRegex = /^marker:(\d+):text$/;
  const walker = document.createTreeWalker(
    fragment,
    NodeFilter.SHOW_COMMENT,
    null
  );
  let currentNode: Comment | null;
  while ((currentNode = walker.nextNode() as Comment | null)) {
    const markerMatch = currentNode.nodeValue?.match(textMarkerRegex);
    if (markerMatch) {
      const idx = parseInt(markerMatch[1], 10);
      const bindingValue = values[idx];
      let newNode: Node;
      if (bindingValue instanceof Signal) {
        // Create an initial text node from the signal's current value.
        newNode = document.createTextNode(String(bindingValue.peek()));
        // Update the text content reactively.
        effect(() => {
          newNode.textContent = String(bindingValue.value);
        });
      } else {
        newNode = document.createTextNode(String(bindingValue));
      }
      currentNode.parentNode?.replaceChild(newNode, currentNode);
    }
  }
}

/**
 * Processes attribute and event binding markers in all elements of the fragment.
 *
 * It searches for markers in attribute values:
 *
 * - Event bindings are marked as: __event_marker_{index}__
 * - Attribute bindings are marked as: __attr_marker_{index}__
 *
 * For event bindings, if the dynamic value is a function it is added as an event
 * listener (with the event name derived from the attribute name). For attribute
 * bindings, if the value is a Signal an effect is created to update the attribute.
 *
 * @param fragment The DocumentFragment to process.
 * @param values The dynamic values corresponding to the template expressions.
 */
function processAttrAndEventBindings(
  fragment: DocumentFragment,
  values: any[]
): void {
  const eventMarkerRegex = /^__event_marker_(\d+)__$/;
  const attrMarkerRegex = /^__attr_marker_(\d+)__$/;

  // Query all elements so we can inspect their attributes.
  const elements = fragment.querySelectorAll("*");
  elements.forEach((el) => {
    // Convert NamedNodeMap to array for iteration.
    Array.from(el.attributes).forEach((attr) => {
      const { name, value: attrValue } = attr;
      let match: RegExpMatchArray | null;
      // Process event binding markers.
      if ((match = attrValue.match(eventMarkerRegex))) {
        const idx = parseInt(match[1], 10);
        const bindingValue = values[idx];
        el.removeAttribute(name);
        if (typeof bindingValue === "function") {
          // Derive the event name by stripping the leading "on".
          const eventName = name.slice(2);
          el.addEventListener(eventName, bindingValue);
        }
        return; // Skip further processing for this attribute.
      }
      // Process generic attribute binding markers.
      if ((match = attrValue.match(attrMarkerRegex))) {
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
    });
  });
}

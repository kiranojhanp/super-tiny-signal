/**
 * Combines multiple DocumentFragments into one.
 *
 * @param fragments - The fragments to combine.
 * @returns A new DocumentFragment containing the nodes from all fragments.
 */
export function combineFragments(
  ...fragments: DocumentFragment[]
): DocumentFragment {
  const container = document.createDocumentFragment();
  for (const frag of fragments) {
    if (frag.hasChildNodes()) {
      container.append(frag);
    }
  }
  return container;
}

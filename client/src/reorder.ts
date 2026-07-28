/**
 * Reassign `sortOrder` on the items named in `orderedIds` to match their index,
 * then return the whole list sorted by sortOrder. Items not in `orderedIds` keep
 * their existing order. Used for optimistic drag-and-drop reordering.
 */
export function reorderByIds<T extends { id: string; sortOrder: number }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
  return items
    .map((item) => (orderMap.has(item.id) ? { ...item, sortOrder: orderMap.get(item.id)! } : item))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

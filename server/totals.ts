export type LineItem = { description: string; quantity: number; unitPrice: number };

export function computeTotals(
  items: LineItem[],
  discountPercent: number,
  taxPercent: number,
) {
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableBase * taxPercent) / 100;
  const total = taxableBase + taxAmount;
  return { subtotal, discountAmount, taxableBase, taxAmount, total };
}

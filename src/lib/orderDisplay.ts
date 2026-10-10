// Display only: absent or invalid recorded amounts must not imply a tax value.
export function formatRecordedTax(value: unknown, formatPrice: (amount: number) => string): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatPrice(value) : '-';
}

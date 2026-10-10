export function formatVariantSelection(
  name: string | null | undefined,
  attributes: Record<string, string> | null | undefined,
): string | null {
  const values = Object.entries(attributes ?? {})
    .filter(([key]) => key !== 'finishKey')
    .map(([, value]) => value)
    .filter(Boolean);
  const detail = values.join(' / ');
  if (name && detail && !name.includes(detail)) return `${name} (${detail})`;
  return name || detail || null;
}

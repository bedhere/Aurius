const EMPTY_CONTACT = { phone: '', email: 'info@aurius.com.au', address: '', hours: '' };

/** Do not publish the original development seed's example contact details. */
export function publicCompanyInfo(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_CONTACT };
  const contact = { ...EMPTY_CONTACT, ...value } as Record<string, unknown>;
  if (contact.phone === '+61 2 8000 0000' && contact.address === 'Unit 8, 12-14 Orchard Road, Sydney NSW 2000, Australia') {
    return { ...contact, phone: '', address: '', hours: '' };
  }
  return contact;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtMoney(v: number): string {
  return `AUD ${v.toFixed(2)}`;
}

export function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (['PAID', 'DELIVERED', 'ACTIVE', 'APPROVED', 'VERIFIED', 'SENT', 'CONFIRMED', 'CREDITED', 'SHIPPED', 'PUBLISHED'].includes(s)) return 'badge-green';
  if (['PENDING_PAYMENT', 'PROCESSING', 'PENDING', 'PENDING_REVIEW', 'SUBMITTED', 'UNDER_REVIEW', 'QUEUED', 'PAYMENT_PROCESSING', 'PREPARING', 'UNVERIFIED', 'REPORTED'].includes(s)) return 'badge-amber';
  if (['CANCELLED', 'REJECTED', 'FAILED', 'REFUNDED', 'SUSPENDED', 'FROZEN', 'CRITICAL'].includes(s)) return 'badge-red';
  if (['MORE_INFO_REQUIRED', 'AFTER_SALES', 'WARNING', 'RETURNED', 'ARCHIVED', 'DEV_LOGGED'].includes(s)) return 'badge-blue';
  return 'badge-gray';
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'REGIONAL_AGENT':
      return 'Authorised Regional Distributor';
    case 'LICENSED_TRADESMAN':
      return 'Plumber Account';
    case 'SUB_DEALER':
      return 'Authorised Dealer';
    case 'WATERWORKER':
      return 'Plumber Account';
    case 'BUILDER':
      return 'Builder Account';
    case 'ADMIN':
      return 'Administrator';
    default:
      return role;
  }
}

export function roleShort(role: string): string {
  switch (role) {
    case 'REGIONAL_AGENT':
      return 'Level 1 · Agent';
    case 'LICENSED_TRADESMAN':
      return 'Level 2 · Tradesman';
    case 'SUB_DEALER':
      return 'Level 3 · Sub-dealer';
    case 'WATERWORKER':
      return 'Plumber Account';
    case 'BUILDER':
      return 'Builder Account';
    case 'ADMIN':
      return 'Admin';
    default:
      return role;
  }
}

export function stateLabel(code: string): string {
  const map: Record<string, string> = {
    NSW: 'New South Wales',
    VIC: 'Victoria',
    QLD: 'Queensland',
    WA: 'Western Australia',
    SA: 'South Australia',
    TAS: 'Tasmania',
    ACT: 'Australian Capital Territory',
    NT: 'Northern Territory',
  };
  return map[code] ?? code;
}

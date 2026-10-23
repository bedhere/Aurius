import { ReactNode } from 'react';
import { useI18n } from '../i18n/LanguageContext';

export function Alert({ type, children }: { type: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  const { t } = useI18n();
  return <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>{typeof children === 'string' ? t(children) : children}</div>;
}

export function Spinner() {
  return <div className="spinner" />;
}

export function PageLoading() {
  const { t } = useI18n();
  return <div className="page-loading"><Spinner /><p className="muted">{t('common.loading')}</p></div>;
}

export function Pagination({ page, pageSize, total, onChange }: {
  page: number; pageSize: number; total: number; onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const nums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  return (
    <div className="pagination">
      <button aria-label={t('Previous page')} disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {nums.map((n) => <button key={n} className={n === page ? 'active' : ''} onClick={() => onChange(n)}>{n}</button>)}
      <button aria-label={t('Next page')} disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

export function PriceDisplay({ price, prices, rrp, priceNote, stock }: {
  price: { value: number; currency: string; level: number } | null;
  prices?: {
    retail: number | null;
    promo: number | null;
    member: number | null;
    memberLabel: string;
    currency: string;
  } | null;
  rrp: number | null; priceNote: string | null; stock: number;
}) {
  const { t } = useI18n();
  if (prices) {
    const format = (value: number | null) => value == null ? '—' : `${prices.currency} ${value.toFixed(2)}`;
    return (
      <div className="product-prices">
        <div className="price"><span className="currency">{prices.currency} </span>{(price?.value ?? prices.promo ?? prices.retail ?? 0).toFixed(2)}</div>
        {prices.retail != null && <div className="small muted">{t('Retail price:')} {format(prices.retail)}</div>}
        {prices.promo != null && <div className="small price-promo">{t('Promotion price:')} {format(prices.promo)}</div>}
        {prices.member != null && <div className="small price-member">{t(prices.memberLabel)}: {format(prices.member)}</div>}
        {rrp != null && <div className="rrp">{t('RRP')} {rrp.toFixed(2)}</div>}
      </div>
    );
  }
  if (price) {
    return <div><div className="price"><span className="currency">{price.currency} </span>{price.value.toFixed(2)}</div>
      {rrp != null && rrp > price.value && <div className="rrp">{t('RRP')} {rrp.toFixed(2)}</div>}</div>;
  }
  if (stock <= 0) return <div className="price-locked">{t('common.outOfStock')}</div>;
  return <div><div className="price-locked">{priceNote ? t(priceNote) : null}</div></div>;
}

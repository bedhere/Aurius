import { useI18n } from '../i18n/LanguageContext';

const WARRANTY_BY_CATEGORY: Record<string, 'water' | 'toilet' | undefined> = {
  'whole-house water purification': 'water',
  'shower filtration': 'water',
  '全屋净水': 'water',
  '全屋水净化': 'water',
  '淋浴净水': 'water',
  'smart toilet': 'toilet',
  '智能马桶': 'toilet',
};

export default function ProductWarrantyBadge({ category }: { category: string }) {
  const { t } = useI18n();
  const variant = WARRANTY_BY_CATEGORY[category.trim().toLowerCase()];
  if (!variant) return null;

  return (
    <div
      className={`product-warranty product-warranty--${variant}`}
      role="img"
      aria-label={t(`detail.warranty.${variant}`)}
    />
  );
}

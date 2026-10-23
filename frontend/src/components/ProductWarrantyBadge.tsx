import { useI18n } from '../i18n/LanguageContext';

const WARRANTY_BY_CATEGORY: Record<string, 'water' | 'toilet' | undefined> = {
  'whole-house water purification': 'water',
  'whole house water filtration': 'water',
  'whole-house water filtration': 'water',
  'shower filtration': 'water',
  '全屋净水': 'water',
  '全屋水净化': 'water',
  '淋浴净水': 'water',
  'smart toilet': 'toilet',
  'smart toilets': 'toilet',
  'toilet lid': 'toilet',
  'toilet-lid': 'toilet',
  'smart toilet seat': 'toilet',
  'smart toilet seats': 'toilet',
  '智能马桶': 'toilet',
  '智能马桶盖': 'toilet',
};

export default function ProductWarrantyBadge({ category, compact = false }: { category: string; compact?: boolean }) {
  const { t } = useI18n();
  const variant = WARRANTY_BY_CATEGORY[category.trim().toLowerCase()];
  if (!variant) return null;

  return (
    <div
      className={`product-warranty product-warranty--${variant}${compact ? ' product-warranty--compact' : ''}`}
      role="img"
      aria-label={t(`detail.warranty.${variant}`)}
    />
  );
}

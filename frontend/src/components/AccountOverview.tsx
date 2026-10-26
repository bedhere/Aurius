import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/LanguageContext';

const ACCOUNTS: Record<string, { title: string; pricing: string; description: string }> = {
  LICENSED_TRADESMAN: { title: 'Plumber Account', pricing: 'Plumber price', description: 'Product information and purchasing access for your approved trade account.' },
  WATERWORKER: { title: 'Plumber Account', pricing: 'Plumber price', description: 'Product information and purchasing access for your approved trade account.' },
  BUILDER: { title: 'Builder Account', pricing: 'Builder price', description: 'Product information and purchasing access for your approved builder account.' },
  REGIONAL_AGENT: { title: 'Authorised Regional Distributor', pricing: 'Regional distributor price', description: 'Your regional distribution account information and product resources.' },
  SUB_DEALER: { title: 'Authorised Dealer', pricing: 'Dealer price', description: 'Your dealer account information and product resources.' },
};

export function AccountOverview() {
  const { user } = useAuth();
  const { t } = useI18n();
  const account = user ? ACCOUNTS[user.role] : null;
  if (!account) return null;
  return <section className="panel account-overview"><h3>{t(account.title)}</h3><p className="muted">{t(account.description)}</p><div className="form-grid-2"><div><strong>{t('Account pricing')}</strong><p>{t(account.pricing)}</p><p className="small muted">{t('Only your account pricing is shown. Products without a configured price are available on enquiry.')}</p></div><div><strong>{t(user?.role === 'REGIONAL_AGENT' ? 'Regional appointment' : 'Account information')}</strong><p>{t('Contact AURIUS for your account and partnership details.')}</p><Link className="btn btn-outline btn-sm" to="/contact">{t('Contact AURIUS')}</Link></div></div></section>;
}

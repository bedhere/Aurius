import { Link } from 'react-router-dom';
import { ResourceLibrary } from '../../components/ResourceLibrary';
import { useI18n } from '../../i18n/LanguageContext';

export default function Warranty() {
  const { t } = useI18n();
  return <>
    <section className="page-band"><div className="container"><h1 className="section-title">{t('Warranty Terms')}</h1><p className="section-sub">{t('Product warranty information and service assistance.')}</p></div></section>
    <section className="section"><div className="container"><ResourceLibrary categories={['WARRANTY_TERMS']} /><p className="muted">{t('Your rights under Australian Consumer Law are unaffected.')}</p><Link to="/support#after-sales" className="btn btn-primary">{t('Contact Support')}</Link></div></section>
  </>;
}

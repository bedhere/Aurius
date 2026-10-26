import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="pdf-footer">
      <div className="container pdf-footer__quality">
        <div className="footer-brand-strip"><strong>AURIUS</strong><p>{t('Refined design. Intelligent comfort.')}</p><Link to="/support#product-resources">{t('Product Resources')}</Link></div>
      </div>
      <div className="container pdf-footer__meta">
        <span>{t('footer.rights')}</span>
        <div>
          <Link to="/privacy-policy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </div>
      </div>
    </footer>
  );
}

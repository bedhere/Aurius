import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="pdf-footer">
      <div className="container pdf-footer__quality">
        <img src="/uploads/brand/quality-strip.png" alt={t('footer.quality')} />
      </div>
      <div className="container pdf-footer__meta">
        <span>{t('footer.rights')}</span>
        <div>
          <Link to="/privacy-policy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/dealer-agreement">{t('footer.dealer')}</Link>
        </div>
      </div>
    </footer>
  );
}

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/LanguageContext';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const close = () => setOpen(false);
  const navItem = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  const cartDestination = user?.role === 'ADMIN' ? '/admin' : user ? '/member/cart' : '/products';

  return (
    <header className="site-header pdf-header">
      <div className="container site-header__top">
        <Link to="/" className="brand" onClick={close}>
          <img src="/brand/aurius-logo.svg" alt="AURIUS — Smart Toilet | Whole House Water Filtration" className="brand__wordmark" />
        </Link>
        <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label={t('nav.menu')}>
          {t('nav.menu')}
        </button>
        <nav className={`main-nav ${open ? 'open' : ''}`}>
          <NavLink to="/vision" className={navItem} onClick={close}>{t('nav.vision')}</NavLink>
          <NavLink to="/products" className={navItem} onClick={close}>{t('nav.products')}</NavLink>
          <NavLink to="/stockists" className={navItem} onClick={close}>{t('nav.stockists')}</NavLink>
          <NavLink to="/vip" className={({ isActive }) => `${navItem({ isActive })} nav-vip`} onClick={close}>VIP</NavLink>
          <NavLink to="/trade" className={navItem} onClick={close}>{t('nav.trade')}</NavLink>
          <NavLink to="/support" className={navItem} onClick={close}>{t('nav.support')}</NavLink>
          <NavLink to="/contact" className={navItem} onClick={close}>{t('nav.contact')}</NavLink>
        </nav>
        <div className="pdf-header__actions">
          <Link to="/trade" className="pdf-header__partner" onClick={close}>Become Partner</Link>
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'zh-CN' : 'en')}
            aria-label={t('language.toggle')}
            title={t('language.toggle')}
          >
            {t('language.current')}
          </button>
          <Link to="/products" className="pdf-header__icon pdf-header__icon--search" aria-label={t('header.search')} title={t('header.search')} />
          <Link to={cartDestination} className="pdf-header__icon pdf-header__icon--bag" aria-label={t('header.cart')} title={t('header.cart')} />
        </div>
      </div>
    </header>
  );
}

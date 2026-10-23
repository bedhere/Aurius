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
        <button className="nav-toggle" type="button" onClick={() => setOpen(!open)} aria-label={t('nav.menu')} aria-expanded={open} aria-controls="main-navigation">
          {open ? t('Close') : t('nav.menu')}
        </button>
        <nav id="main-navigation" aria-label={t('Main navigation')} className={`main-nav ${open ? 'open' : ''}`} onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
          <NavLink to="/vision" className={navItem} onClick={close}>VISION</NavLink>
          <NavLink to="/products" className={navItem} onClick={close}>PRODUCTS</NavLink>
          <NavLink to="/stockists" className={navItem} onClick={close}>STOCKISTS</NavLink>
          <NavLink to="/plumbers-builders" className={navItem} onClick={close}>PLUMBERS &amp; BUILDERS</NavLink>
          <NavLink to="/trade" className={navItem} onClick={close}>TRADE</NavLink>
          <NavLink to="/support" className={navItem} onClick={close}>SUPPORT</NavLink>
          <NavLink to="/contact" className={navItem} onClick={close}>CONTACT</NavLink>
          <NavLink to="/become-a-partner" className="nav-partner-mobile" onClick={close}>BECOME A PARTNER</NavLink>
        </nav>
        <div className="pdf-header__actions">
          <Link to="/become-a-partner" className="pdf-header__partner" onClick={close}>BECOME A PARTNER</Link>
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

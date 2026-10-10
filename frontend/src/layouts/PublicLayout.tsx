import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Sensitive pages must not be indexed (requirement 33)
    const sensitive = ['/vip', '/trade', '/member', '/admin', '/login', '/forgot-password', '/reset-password'];
    const el = document.querySelector('meta[name="robots"]');
    if (sensitive.some((p) => pathname.startsWith(p))) {
      if (el) el.setAttribute('content', 'noindex, nofollow');
      else {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
      }
    } else if (el) {
      el.setAttribute('content', 'index, follow');
    }
  }, [pathname]);

  return (
    <>
      <Header />
      <main className={pathname === '/' ? 'public-main--homepage' : undefined}>
        <Outlet />
      </main>
      {pathname !== '/' && <Footer />}
    </>
  );
}

import { useI18n } from '../i18n/LanguageContext';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoading } from '../components/ui';

// Member centre shell (requirement 48): Dashboard / My Profile / My Orders /
// My Performance / Downloads / Shipping Addresses / Security / Logout.
export default function MemberLayout() {
  const { t, language, setLanguage } = useI18n();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/vip" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;

  const item = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="member-layout">
      <aside className="member-side">
        <div className="member-side__head">
          <strong>AURIUS</strong>
          <span className="small muted">{t("Member Centre")}</span>
        </div>
        <nav>
          <NavLink to="/member" end className={item}>
            {t("Dashboard")}
          </NavLink>
          <NavLink to="/member/profile" className={item}>
            {t("My Profile")}
          </NavLink>
          <NavLink to="/member/orders" className={item}>
            {t("My Orders")}
          </NavLink>
          <NavLink to="/member/cart" className={item}>
            {t("My Cart")}
          </NavLink>
          <NavLink to="/member/performance" className={item}>
            {t("My Performance")}
          </NavLink>
          <NavLink to="/member/downloads" className={item}>
            {t("Downloads")}
          </NavLink>
          <NavLink to="/member/addresses" className={item}>
            {t("Shipping Addresses")}
          </NavLink>
          <NavLink to="/member/security" className={item}>
            {t("Security")}
          </NavLink>
        </nav>
        <div className="member-side__foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLanguage(language === 'en' ? 'zh-CN' : 'en')} aria-label={t('language.toggle')}>{t('language.current')}</button>
          <Link to="/" className="btn btn-ghost btn-sm">{t("Back to website")}</Link>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>{t("Log out")}</button>
        </div>
      </aside>
      <section className="member-main">
        <Outlet />
      </section>
    </div>
  );
}

import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoading } from '../components/ui';
import { tAdmin } from '../i18n/strings';

const MENU: { key: string; to: string; end?: boolean }[] = [
  { key: 'dashboard', to: '/admin', end: true },
  { key: 'applications', to: '/admin/applications' },
  { key: 'members', to: '/admin/members' },
  { key: 'products', to: '/admin/products' },
  { key: 'prices', to: '/admin/price-rules' },
  { key: 'orders', to: '/admin/orders' },
  { key: 'payments', to: '/admin/payments' },
  { key: 'performance', to: '/admin/performance' },
  { key: 'installations', to: '/admin/installations' },
  { key: 'referrals', to: '/admin/referrals' },
  { key: 'resources', to: '/admin/resources' },
  { key: 'enquiries', to: '/admin/enquiries' },
  { key: 'downloads', to: '/admin/downloads' },
  { key: 'emailLogs', to: '/admin/email-logs' },
  { key: 'auditLogs', to: '/admin/audit-logs' },
  { key: 'securityLogs', to: '/admin/security-logs' },
  { key: 'dealers', to: '/admin/dealers' },
  { key: 'settings', to: '/admin/settings' },
];

// Admin console — fully separated from the member centre (requirement 57).
// Bilingual labels: Chinese primary with English tooltips.
export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const navigate = useNavigate();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;

  const handleLogout = async () => {
    await logout();
    navigate('/admin-login');
  };

  const item = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  const dealerLabel = tAdmin('dealers', lang);

  return (
    <div className="admin-layout">
      <aside className="admin-side">
        <div className="admin-side__head">
          <strong>AURIUS</strong>
          <span className="small muted">Admin Console</span>
        </div>
        <nav>
          {MENU.map((m) => (
            <NavLink key={m.key} to={m.to} end={m.end} className={item}>
              <span className="zh">{m.key === 'dealers' ? dealerLabel : tAdmin(m.key, lang)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-side__foot">
          <Link to="/" className="btn btn-ghost btn-sm">Back to website</Link>
          <button className="btn btn-ghost btn-sm" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            {tAdmin('logout', lang)}
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <Outlet context={{ lang }} />
      </section>
    </div>
  );
}

export function useAdminLang(): 'zh' | 'en' {
  return 'zh';
}

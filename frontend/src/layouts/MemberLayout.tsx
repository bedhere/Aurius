import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoading } from '../components/ui';

// Member centre shell (requirement 48): Dashboard / My Profile / My Orders /
// My Performance / Downloads / Shipping Addresses / Security / Logout.
export default function MemberLayout() {
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
          <span className="small muted">Member Centre</span>
        </div>
        <nav>
          <NavLink to="/member" end className={item}>
            Dashboard
          </NavLink>
          <NavLink to="/member/profile" className={item}>
            My Profile
          </NavLink>
          <NavLink to="/member/orders" className={item}>
            My Orders
          </NavLink>
          <NavLink to="/member/cart" className={item}>
            My Cart
          </NavLink>
          <NavLink to="/member/performance" className={item}>
            My Performance
          </NavLink>
          <NavLink to="/member/downloads" className={item}>
            Downloads
          </NavLink>
          <NavLink to="/member/addresses" className={item}>
            Shipping Addresses
          </NavLink>
          <NavLink to="/member/security" className={item}>
            Security
          </NavLink>
        </nav>
        <div className="member-side__foot">
          <Link to="/" className="btn btn-ghost btn-sm">Back to website</Link>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <section className="member-main">
        <Outlet />
      </section>
    </div>
  );
}

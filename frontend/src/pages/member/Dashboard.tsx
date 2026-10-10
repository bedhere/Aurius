import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Alert, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, fmtMoney, roleLabel, statusBadgeClass } from '../../utils/format';
import '../../assets/styles/pages-member.css';

export default function Dashboard() {
  const { me, user } = useAuth();
  const [perf, setPerf] = useState<{ totalOrders: number; totalSales: number; monthSales: number; totalInstalledUnits: number } | null>(null);
  const [orders, setOrders] = useState<{ items: { id: number; orderNumber: string; createdAt: string; total: number; status: string }[] } | null>(null);

  useEffect(() => {
    api.get('/api/performance').then(setPerf).catch(() => setPerf(null));
    api.get('/api/orders?pageSize=5').then(setOrders).catch(() => setOrders(null));
  }, []);

  if (me?.underReview) {
    return (
      <div className="review-banner">
        <h2>Your application is under review.</h2>
        <p className="muted">
          You can view your basic profile and review status. Trade pricing, ordering and the download
          centre become available once your application is approved.
        </p>
        {me.applicationStatus && (
          <span className={`badge ${statusBadgeClass(me.applicationStatus)}`}>{me.applicationStatus}</span>
        )}
        {me.requestedInfo && (
          <div className="mt-2">
            <Alert type="info">
              <strong>Action required:</strong> {me.requestedInfo}
            </Alert>
          </div>
        )}
        {me.rejectReason && (
          <div className="mt-2">
            <Alert type="error">
              <strong>Application returned:</strong> {me.rejectReason}
            </Alert>
          </div>
        )}
        <div className="mt-2">
          <Link to="/member/profile" className="btn btn-primary">
            View My Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="member-hero">
        <h2>Welcome back{me?.memberProfile?.firstName ? `, ${me.memberProfile.firstName}` : ''}</h2>
        <p className="small muted" style={{ margin: 0 }}>
          {me?.memberId?.aurId ? `AURIUS Member ID: ${me.memberId.aurId}` : 'Member'} · {user ? roleLabel(user.role) : ''}
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{perf?.totalOrders ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">{fmtMoney(perf?.totalSales ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value">{fmtMoney(perf?.monthSales ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Installed Units</div>
          <div className="stat-value">{perf?.totalInstalledUnits ?? 0}</div>
        </div>
      </div>

      <div className="panel">
        <h3>Recent Orders</h3>
        {orders === null ? (
          <p className="muted small">Order history unavailable.</p>
        ) : orders.items.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.items.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td>{fmtDate(o.createdAt)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span>
                    </td>
                    <td>{fmtMoney(o.total)}</td>
                    <td>
                      <Link to={`/member/orders/${o.id}`} className="btn btn-outline btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2">
          <Link to="/member/orders" className="btn btn-ghost btn-sm">
            View all orders
          </Link>
        </div>
      </div>
    </>
  );
}

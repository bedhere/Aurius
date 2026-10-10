import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { fmtMoney } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface DashboardData {
  pendingApplications: number;
  activeMembers: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  todayOrders: number;
  monthOrders: number;
  monthSales: number;
  yearSales: number;
  pendingShipments: number;
  stateRanking: { key: string; sales: number; orders: number }[];
  roleShare: { key: string; sales: number; orders: number }[];
  productRanking: { key: string; sales: number; orders: number }[];
}

export default function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>('/api/admin/dashboard').then(setD).catch(() => setD(null));
  }, []);

  if (!d) return <div className="page-loading">Loading…</div>;

  return (
    <>
      <h2>{tAdmin('dashboard')}</h2>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{tAdmin('pendingApplications')}</div>
          <div className="stat-value">{d.pendingApplications}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{tAdmin('activeMembers')}</div>
          <div className="stat-value">{d.activeMembers}</div>
          <div className="small muted">
            {tAdmin('level1')}: {d.level1Count} · {tAdmin('level2')}: {d.level2Count} · {tAdmin('level3')}: {d.level3Count}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{tAdmin('todayOrders')} / {tAdmin('monthOrders')}</div>
          <div className="stat-value">
            {d.todayOrders} / {d.monthOrders}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{tAdmin('monthSales')}</div>
          <div className="stat-value">{fmtMoney(d.monthSales)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{tAdmin('yearSales')}</div>
          <div className="stat-value">{fmtMoney(d.yearSales)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{tAdmin('pendingShipments')}</div>
          <div className="stat-value">{d.pendingShipments}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>区域销售排行 (State Ranking)</h3>
          <table className="mini-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Sales</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {d.stateRanking.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td>{fmtMoney(r.sales)}</td>
                  <td>{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h3>角色销售占比 (Role Share)</h3>
          <table className="mini-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Sales</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {d.roleShare.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}</td>
                  <td>{fmtMoney(r.sales)}</td>
                  <td>{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>产品销售排行 (Product Ranking)</h3>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Sales</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {d.productRanking.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td>{fmtMoney(r.sales)}</td>
                <td>{r.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

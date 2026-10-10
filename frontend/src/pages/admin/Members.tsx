import { useEffect, useState } from 'react';
import { api, ApiError, getAccessToken } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { fmtDate, fmtMoney, roleLabel, statusBadgeClass } from '../../utils/format';
import { AU_STATES } from '../../api/types';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface MemberRow {
  id: number;
  memberId: string | null;
  email: string;
  contactName: string | null;
  companyName: string | null;
  phone: string;
  abnStatus: string | null;
  tradeType: string | null;
  role: string;
  state: string | null;
  registeredAt: string;
  accountStatus: string;
  totalSales: number;
  totalOrders: number;
  monthSales: number;
  yearSales: number;
  lastOrderAt: string | null;
  lastLoginAt: string | null;
}

export default function Members() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: MemberRow[]; total: number; page: number; pageSize: number } | null>(null);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (state) params.set('state', state);
    if (status) params.set('status', status);
    api.get(`/api/admin/members?${params.toString()}`).then(setData).catch(() => setData(null));
  };

  useEffect(load, [search, role, state, status, page]);

  const setStatusAction = async (action: string) => {
    if (!selected) return;
    const reason = action === 'FREEZE' ? window.prompt('Reason') ?? undefined : undefined;
    try {
      await api.post(`/api/admin/members/${selected.id}/status`, { action, reason });
      setMessage({ type: 'success', text: 'Member status updated.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const changeRole = async () => {
    if (!selected) return;
    const role = window.prompt('New role (REGIONAL_AGENT / LICENSED_TRADESMAN / SUB_DEALER)');
    if (!role) return;
    const reason = window.prompt('Reason') ?? '';
    try {
      await api.post(`/api/admin/members/${selected.id}/role`, { role, reason });
      setMessage({ type: 'success', text: 'Role updated.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const exportExcel = async () => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (state) params.set('state', state);
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin/members/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurius-members.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h2>{tAdmin('members')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="admin-filters">
        <input type="text" placeholder="Search…" onKeyDown={(e) => { if (e.key === 'Enter') { setSearch((e.target as HTMLInputElement).value.trim()); setPage(1); } }} />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="REGIONAL_AGENT">Regional Agent</option>
          <option value="LICENSED_TRADESMAN">Licensed Tradesman</option>
          <option value="SUB_DEALER">Sub-dealer</option>
        </select>
        <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
          <option value="">All states</option>
          {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'MORE_INFO_REQUIRED', 'FROZEN', 'SUSPENDED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={exportExcel}>{tAdmin('export')}</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Company</th>
              <th>Role</th>
              <th>State</th>
              <th>Status</th>
              <th>Total Sales</th>
              <th>Orders</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((m) => (
              <tr key={m.id}>
                <td>{m.memberId ?? '—'}</td>
                <td className="small">{m.email}</td>
                <td>{m.contactName ?? '—'}</td>
                <td>{m.companyName ?? '—'}</td>
                <td>{roleLabel(m.role)}</td>
                <td>{m.state ?? '—'}</td>
                <td><span className={`badge ${statusBadgeClass(m.accountStatus)}`}>{m.accountStatus}</span></td>
                <td>{fmtMoney(m.totalSales)}</td>
                <td>{m.totalOrders}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setSelected(m)}>Detail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}

      {selected && (
        <div className="panel mt-2">
          <h3>{selected.memberId ?? selected.email}</h3>
          <div className="detail-grid">
            <div>
              <div className="kv"><b>Email</b><span>{selected.email}</span></div>
              <div className="kv"><b>Contact</b><span>{selected.contactName ?? '—'}</span></div>
              <div className="kv"><b>Company</b><span>{selected.companyName ?? '—'}</span></div>
              <div className="kv"><b>Phone</b><span>{selected.phone || '—'}</span></div>
              <div className="kv"><b>ABN Status</b><span>{selected.abnStatus ?? '—'}</span></div>
              <div className="kv"><b>Trade Type</b><span>{selected.tradeType ?? '—'}</span></div>
            </div>
            <div>
              <div className="kv"><b>Role</b><span>{roleLabel(selected.role)}</span></div>
              <div className="kv"><b>State</b><span>{selected.state ?? '—'}</span></div>
              <div className="kv"><b>Registered</b><span>{fmtDate(selected.registeredAt)}</span></div>
              <div className="kv"><b>Status</b><span className={`badge ${statusBadgeClass(selected.accountStatus)}`}>{selected.accountStatus}</span></div>
              <div className="kv"><b>This Month</b><span>{fmtMoney(selected.monthSales)}</span></div>
              <div className="kv"><b>This Year</b><span>{fmtMoney(selected.yearSales)}</span></div>
              <div className="kv"><b>Last Order</b><span>{fmtDate(selected.lastOrderAt)}</span></div>
              <div className="kv"><b>Last Login</b><span>{fmtDate(selected.lastLoginAt)}</span></div>
            </div>
          </div>
          <div className="action-bar">
            <button className="btn btn-danger btn-sm" onClick={() => setStatusAction('FREEZE')}>{tAdmin('freeze')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setStatusAction('UNFREEZE')}>{tAdmin('unfreeze')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setStatusAction('SUSPEND')}>Suspend</button>
            <button className="btn btn-outline btn-sm" onClick={changeRole}>Change Role</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </>
  );
}

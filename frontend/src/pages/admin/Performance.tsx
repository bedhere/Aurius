import { useEffect, useState } from 'react';
import { api, getAccessToken } from '../../api/client';
import { fmtMoney } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface Row {
  key: string;
  sales: number;
  orders: number;
  units: number;
  referrals: number;
}

const GROUPS = ['member', 'state', 'role', 'category', 'day', 'week', 'month', 'quarter', 'year'];

export default function Performance() {
  const [groupBy, setGroupBy] = useState('state');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => {
    const params = new URLSearchParams({ groupBy });
    if (start) params.set('start', new Date(start).toISOString());
    if (end) params.set('end', new Date(end).toISOString());
    api.get<{ rows: Row[] }>(`/api/admin/performance?${params.toString()}`).then((d) => setRows(d.rows)).catch(() => setRows([]));
  };
  useEffect(load, [groupBy, start, end]);

  const download = async (format: 'xlsx' | 'pdf') => {
    const params = new URLSearchParams({ groupBy, format });
    if (start) params.set('start', new Date(start).toISOString());
    if (end) params.set('end', new Date(end).toISOString());
    const res = await fetch(`/api/admin/performance/export?${params.toString()}`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurius-performance.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h2>{tAdmin('performance')}</h2>
      <div className="admin-filters">
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={() => download('xlsx')}>{tAdmin('export')}</button>
        <button className="btn btn-outline btn-sm" onClick={() => download('pdf')}>{tAdmin('exportPdf')}</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>{groupBy.toUpperCase()}</th><th>Sales (AUD)</th><th>Orders</th><th>Units</th><th>Referral Sales</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td>{fmtMoney(r.sales)}</td>
                <td>{r.orders}</td>
                <td>{r.units}</td>
                <td>{fmtMoney(r.referrals)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

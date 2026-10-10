import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface LogRow {
  id: number;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
  user: { email: string } | null;
}

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: LogRow[]; total: number; page: number; pageSize: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    api.get(`/api/admin/audit-logs?${params.toString()}`).then(setData).catch(() => setData(null));
  }, [search, page]);

  return (
    <>
      <h2>{tAdmin('auditLogs')}</h2>
      <div className="admin-filters">
        <input type="text" placeholder="Search…" onKeyDown={(e) => { if (e.key === 'Enter') { setSearch((e.target as HTMLInputElement).value.trim()); setPage(1); } }} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((l) => (
              <tr key={l.id}>
                <td className="small">{fmtDateTime(l.createdAt)}</td>
                <td className="small">{l.user?.email ?? '—'}</td>
                <td className="small">{l.action}</td>
                <td className="small">{l.targetType}{l.targetId ? `: ${l.targetId}` : ''}</td>
                <td className="small">{l.details ? l.details.slice(0, 120) : '—'}</td>
                <td className="small">{l.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

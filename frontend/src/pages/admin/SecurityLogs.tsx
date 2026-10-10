import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination } from '../../components/ui';
import { fmtDateTime, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface LogRow {
  id: number;
  level: string;
  eventType: string;
  details: string | null;
  ip: string | null;
  userId: number | null;
  createdAt: string;
}

export default function SecurityLogs() {
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: LogRow[]; total: number; page: number; pageSize: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (level) params.set('level', level);
    api.get(`/api/admin/security-logs?${params.toString()}`).then(setData).catch(() => setData(null));
  }, [level, page]);

  return (
    <>
      <h2>{tAdmin('securityLogs')}</h2>
      <div className="admin-filters">
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
          <option value="">All levels</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Time</th><th>Level</th><th>Event</th><th>Details</th><th>IP</th><th>User</th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((l) => (
              <tr key={l.id}>
                <td className="small">{fmtDateTime(l.createdAt)}</td>
                <td><span className={`badge ${statusBadgeClass(l.level)}`}>{l.level}</span></td>
                <td className="small">{l.eventType}</td>
                <td className="small">{l.details ?? '—'}</td>
                <td className="small">{l.ip ?? '—'}</td>
                <td className="small">{l.userId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination } from '../../components/ui';
import { fmtDateTime, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface LogRow {
  id: number;
  recipient: string;
  subject: string;
  template: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function EmailLogs() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: LogRow[]; total: number; page: number; pageSize: number } | null>(null);

  useEffect(() => {
    api.get(`/api/admin/email-logs?page=${page}&pageSize=20`).then(setData).catch(() => setData(null));
  }, [page]);

  return (
    <>
      <h2>{tAdmin('emailLogs')}</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Recipient</th><th>Subject</th><th>Template</th><th>Status</th><th>Sent At</th><th>Error</th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((l) => (
              <tr key={l.id}>
                <td className="small">{l.recipient}</td>
                <td>{l.subject}</td>
                <td className="small">{l.template}</td>
                <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                <td className="small">{fmtDateTime(l.sentAt)}</td>
                <td className="small">{l.errorMessage ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

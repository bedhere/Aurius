import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { fmtDate, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface Install {
  id: number;
  technicianAurId: string | null;
  productName: string;
  serialNumber: string | null;
  contactEmail: string | null;
  installationDate: string | null;
  installationAddress: string | null;
  status: string;
  createdAt: string;
}

export default function Installations() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Install[]; total: number; page: number; pageSize: number } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    api.get(`/api/admin/installations?${params.toString()}`).then(setData).catch(() => setData(null));
  };
  useEffect(load, [search, page]);

  const confirm = async (id: number) => {
    try {
      await api.post(`/api/admin/installations/${id}/confirm`);
      setMessage({ type: 'success', text: 'Installation confirmed.' });
      load();
    } catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
  };

  return (
    <>
      <h2>{tAdmin('installations')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <div className="admin-filters">
        <input type="text" placeholder="Search…" onKeyDown={(e) => { if (e.key === 'Enter') { setSearch((e.target as HTMLInputElement).value.trim()); setPage(1); } }} />
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Technician</th><th>Product</th><th>Serial</th><th>Email</th><th>Date</th><th>Address</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((i) => (
              <tr key={i.id}>
                <td className="small">{i.technicianAurId ?? '—'}</td>
                <td>{i.productName}</td>
                <td>{i.serialNumber ?? '—'}</td>
                <td className="small">{i.contactEmail ?? '—'}</td>
                <td>{fmtDate(i.installationDate)}</td>
                <td className="small">{i.installationAddress ?? '—'}</td>
                <td><span className={`badge ${statusBadgeClass(i.status)}`}>{i.status}</span></td>
                <td>{i.status !== 'CONFIRMED' && <button className="btn btn-outline btn-sm" onClick={() => confirm(i.id)}>Confirm</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

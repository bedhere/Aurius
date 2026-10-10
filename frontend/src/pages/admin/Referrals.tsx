import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Pagination } from '../../components/ui';
import { fmtDateTime, fmtMoney, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface Referral {
  id: number;
  order: { orderNumber: string };
  referralTechId: string | null;
  referralEmail: string | null;
  orderAmount: number;
  creditedAmount: number;
  status: string;
  creditedAt: string | null;
  createdAt: string;
}

export default function Referrals() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Referral[]; total: number; page: number; pageSize: number } | null>(null);

  useEffect(() => {
    api.get(`/api/admin/referrals?page=${page}&pageSize=20`).then(setData).catch(() => setData(null));
  }, [page]);

  return (
    <>
      <h2>{tAdmin('referrals')}</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Order</th><th>Technician ID</th><th>Referral Email</th><th>Order Amount</th><th>Status</th><th>Credited At</th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r) => (
              <tr key={r.id}>
                <td className="small">{r.order.orderNumber}</td>
                <td className="small">{r.referralTechId ?? '—'}</td>
                <td className="small">{r.referralEmail ?? '—'}</td>
                <td>{fmtMoney(r.orderAmount)}</td>
                <td><span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span></td>
                <td className="small">{fmtDateTime(r.creditedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

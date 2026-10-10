import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { fmtDateTime, fmtMoney, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface PaymentRow {
  id: number;
  orderNumber: string;
  memberAurId: string;
  method: string;
  provider: string;
  amount: number;
  status: string;
  transactionId: string | null;
  reference: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  receipts: { id: number; originalName: string; status: string; uploadedAt: string; url: string }[];
  createdAt: string;
}

export default function Payments() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: PaymentRow[]; total: number; page: number; pageSize: number } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    api.get(`/api/admin/payments?${params.toString()}`).then(setData).catch(() => setData(null));
  };
  useEffect(load, [status, page]);

  const verifyReceipt = async (receiptId: number, action: 'VERIFY' | 'REJECT') => {
    const note = action === 'REJECT' ? window.prompt('Reason') ?? undefined : undefined;
    try {
      await api.post(`/api/admin/receipts/${receiptId}/verify`, { action, note });
      setMessage({ type: 'success', text: action === 'VERIFY' ? 'Receipt verified. Order marked as paid.' : 'Receipt rejected.' });
      load();
    } catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
  };

  return (
    <>
      <h2>{tAdmin('payments')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <div className="admin-filters">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {['UNPAID','PROCESSING','PAID','REFUNDED','CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Order</th><th>Member</th><th>Method</th><th>Amount</th><th>Status</th><th>Transaction</th><th>Paid At</th><th>Receipts</th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p) => (
              <tr key={p.id}>
                <td className="small">{p.orderNumber}</td>
                <td className="small">{p.memberAurId}</td>
                <td>{p.method}</td>
                <td>{fmtMoney(p.amount)}</td>
                <td><span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                <td className="small">{p.transactionId ?? p.reference ?? '—'}</td>
                <td className="small">{fmtDateTime(p.paidAt)}</td>
                <td>
                  {p.receipts.length === 0 ? '—' : p.receipts.map((r) => (
                    <div key={r.id} className="flex items-center gap-1" style={{ gap: 8 }}>
                      <a href={r.url} target="_blank" rel="noreferrer" className="small">{r.originalName}</a>
                      <span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span>
                      {r.status === 'PENDING_REVIEW' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => verifyReceipt(r.id, 'VERIFY')}>Verify</button>
                          <button className="btn btn-danger btn-sm" onClick={() => verifyReceipt(r.id, 'REJECT')}>Reject</button>
                        </>
                      )}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

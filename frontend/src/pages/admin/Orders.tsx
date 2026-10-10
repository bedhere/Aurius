import { useEffect, useState } from 'react';
import { api, ApiError, getAccessToken } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { fmtDateTime, fmtMoney, statusBadgeClass } from '../../utils/format';
import { formatVariantSelection } from '../../utils/variant';
import { AU_STATES } from '../../api/types';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface OrderRow {
  id: number;
  orderNumber: string;
  memberAurId: string;
  email: string;
  products: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  shipmentStatus: string;
  carrier: string | null;
  trackingNumber: string | null;
  orderedAt: string;
  paidAt: string | null;
  shippingState: string;
}

interface OrderDetailFull {
  id: number;
  orderNumber: string;
  memberAurId: string;
  email?: string;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shipping: { name: string; phone: string; street: string; suburb: string; state: string; postcode: string; country: string; method: string };
  items: {
    id: number;
    productName: string;
    sku: string;
    variantId: number | null;
    variantName: string | null;
    variantAttributes: Record<string, string> | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  payments: { id: number; method: string; status: string; transactionId: string | null; amount: number; receipts: { id: number; url: string; originalName: string; status: string }[] }[];
  shipment: { carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; status: string } | null;
  statusHistory: { from: string | null; to: string; note: string | null; at: string }[];
  performance: { adjustments: { type: string; adjustedAmount: number; reason: string | null; adjustedAt: string }[] } | null;
}

export default function Orders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: OrderRow[]; total: number; page: number; pageSize: number } | null>(null);
  const [selected, setSelected] = useState<OrderDetailFull | null>(null);
  const [ship, setShip] = useState({ carrier: '', trackingNumber: '', trackingUrl: '', eta: '' });
  const [refund, setRefund] = useState({ amount: '', reason: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (state) params.set('state', state);
    api.get(`/api/admin/orders?${params.toString()}`).then(setData).catch(() => setData(null));
  };
  useEffect(load, [search, status, paymentStatus, state, page]);

  const loadDetail = (id: number) => {
    setSelected(null);
    api.get<OrderDetailFull>(`/api/admin/orders/${id}`).then(setSelected).catch(() => setSelected(null));
  };

  const doShip = async () => {
    if (!selected) return;
    try {
      await api.post(`/api/admin/orders/${selected.id}/ship`, { carrier: ship.carrier, trackingNumber: ship.trackingNumber, trackingUrl: ship.trackingUrl, eta: ship.eta || null });
      setMessage({ type: 'success', text: 'Order shipped.' });
      loadDetail(selected.id); load();
    } catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
  };

  const deliver = async () => {
    if (!selected) return;
    await api.post(`/api/admin/orders/${selected.id}/deliver`);
    setMessage({ type: 'success', text: 'Marked as delivered.' });
    loadDetail(selected.id); load();
  };

  const doRefund = async () => {
    if (!selected) return;
    try {
      await api.post(`/api/admin/orders/${selected.id}/refund`, { amount: Number(refund.amount), reason: refund.reason });
      setMessage({ type: 'success', text: 'Refunded.' });
      loadDetail(selected.id); load();
    } catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
  };

  const exportExcel = async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (state) params.set('state', state);
    const res = await fetch(`/api/admin/orders/export?${params.toString()}`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aurius-orders.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h2>{tAdmin('orders')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      <div className="admin-filters">
        <input type="text" placeholder="Search…" onKeyDown={(e) => { if (e.key === 'Enter') { setSearch((e.target as HTMLInputElement).value.trim()); setPage(1); } }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All order status</option>
          {['PENDING_PAYMENT','PAYMENT_PROCESSING','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED','AFTER_SALES'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
          <option value="">All payment</option>
          {['UNPAID','PROCESSING','PAID','REFUNDED','CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
          <option value="">All states</option>
          {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={exportExcel}>{tAdmin('export')}</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Order</th><th>Member</th><th>Products</th><th>Total</th><th>Payment</th><th>Shipment</th><th>Status</th><th>Time</th><th></th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((o) => (
              <tr key={o.id}>
                <td className="small">{o.orderNumber}</td>
                <td className="small">{o.memberAurId}</td>
                <td className="small">{o.products}</td>
                <td>{fmtMoney(o.total)}</td>
                <td><span className={`badge ${statusBadgeClass(o.paymentStatus)}`}>{o.paymentStatus}</span></td>
                <td><span className={`badge ${statusBadgeClass(o.shipmentStatus)}`}>{o.shipmentStatus}</span></td>
                <td><span className={`badge ${statusBadgeClass(o.status)}`}>{o.status}</span></td>
                <td className="small">{fmtDateTime(o.orderedAt)}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => loadDetail(o.id)}>Detail</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}

      {selected && (
        <div className="panel mt-2">
          <h3>{selected.orderNumber} — {selected.memberAurId}</h3>
          <div className="detail-grid">
            <div>
              <div className="kv"><b>Status</b><span className={`badge ${statusBadgeClass(selected.status)}`}>{selected.status}</span></div>
              <div className="kv"><b>Payment</b><span className={`badge ${statusBadgeClass(selected.paymentStatus)}`}>{selected.paymentStatus}</span></div>
              <div className="kv"><b>Subtotal</b><span>{fmtMoney(selected.subtotal)}</span></div>
              <div className="kv"><b>Shipping</b><span>{fmtMoney(selected.shippingFee)}</span></div>
              <div className="kv"><b>Total</b><span>{fmtMoney(selected.total)}</span></div>
              <div className="kv"><b>Address</b><span>{selected.shipping.street}, {selected.shipping.suburb}, {selected.shipping.state} {selected.shipping.postcode}</span></div>
            </div>
            <div>
              <div className="kv"><b>Contact</b><span>{selected.shipping.name} · {selected.shipping.phone}</span></div>
              <div className="kv"><b>Method</b><span>{selected.shipping.method}</span></div>
              <div className="kv"><b>Tracking</b><span>{selected.shipment?.trackingNumber ?? '—'}</span></div>
              <div className="kv"><b>Carrier</b><span>{selected.shipment?.carrier ?? '—'}</span></div>
            </div>
          </div>

          <table className="mini-table mt-2">
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
            <tbody>
              {selected.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div>{i.productName}</div>
                    {formatVariantSelection(i.variantName, i.variantAttributes) && (
                      <div className="order-item-variant">
                        Selected: {formatVariantSelection(i.variantName, i.variantAttributes)}
                      </div>
                    )}
                  </td>
                  <td>{i.sku}</td>
                  <td>{i.quantity}</td>
                  <td>{fmtMoney(i.unitPrice)}</td>
                  <td>{fmtMoney(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {selected.payments.length > 0 && (
            <div className="mt-2">
              <b>Payments</b>
              <table className="mini-table">
                <thead><tr><th>Method</th><th>Amount</th><th>Status</th><th>Transaction</th></tr></thead>
                <tbody>
                  {selected.payments.map((p) => (
                    <tr key={p.id}><td>{p.method}</td><td>{fmtMoney(p.amount)}</td><td>{p.status}</td><td className="small">{p.transactionId ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selected.status === 'PAID' && (
            <>
              <div className="action-bar">
                <div className="flex gap-1">
                  <input placeholder="Carrier" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} />
                  <input placeholder="Tracking #" value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} />
                  <input placeholder="Tracking URL" value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} />
                  <input type="date" value={ship.eta} onChange={(e) => setShip({ ...ship, eta: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={doShip}>Ship</button>
                <button className="btn btn-ghost btn-sm" onClick={deliver}>Mark Delivered</button>
              </div>
              <div className="action-bar">
                <input type="number" step="0.01" placeholder="Refund amount" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
                <input placeholder="Reason" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} />
                <button className="btn btn-danger btn-sm" onClick={doRefund}>Refund</button>
              </div>
            </>
          )}

          <b>Status History</b>
          <ul className="timeline">
            {selected.statusHistory.map((h, i) => (
              <li key={i}><span className="badge badge-gray">{fmtDateTime(h.at)}</span><span>{h.from ? `${h.from} → ` : ''}<strong>{h.to}</strong>{h.note ? ` — ${h.note}` : ''}</span></li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm mt-2" onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </>
  );
}

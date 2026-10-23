import { useI18n } from '../../i18n/LanguageContext';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { OrderDetail } from '../../api/types';
import { Alert, Spinner } from '../../components/ui';
import { fmtDateTime, fmtMoney, statusBadgeClass } from '../../utils/format';
import { formatVariantSelection } from '../../utils/variant';
import '../../assets/styles/pages-member.css';

interface PayOptions {
  methods: string[];
  orderNumber: string;
  total: number;
  bankTransfer: { bankName: string; bsb: string; accountName: string; accountNumber: string; instructions?: string };
  reference: string;
}

export default function OrderDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payOpts, setPayOpts] = useState<PayOptions | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<OrderDetail>(`/api/orders/${id}`)
      .then(setOrder)
      .catch((e: ApiError) => {
        if (e.status === 403 || e.status === 404) setForbidden(true);
      });
    api
      .get<PayOptions>(`/api/orders/${id}/payment-options`)
      .then(setPayOpts)
      .catch(() => setPayOpts(null));
  }, [id]);

  useEffect(load, [load]);

  if (forbidden) {
    return (
      <div className="panel">
        <Alert type="error">{t("You cannot view this order.")}</Alert>
        <Link to="/member/orders" className="btn btn-outline">
          {t("Back to My Orders")}
        </Link>
      </div>
    );
  }
  if (!order) return <Spinner />;

  const unpaid = ['UNPAID', 'PROCESSING'].includes(order.paymentStatus);

  const pay = async (method: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await api.post<{ approvalUrl?: string; checkoutUrl?: string; orderNumber: string }>(`/api/orders/${id}/pay`, { method });
      if (r.approvalUrl) window.location.href = r.approvalUrl;
      else if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else {
        setMessage({ type: 'success', text: 'Payment processed.' });
        load();
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  const uploadReceipt = async () => {
    if (!receiptFile) return;
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', receiptFile);
      await api.postForm(`/api/orders/${id}/bank-receipt`, fd);
      setMessage({ type: 'success', text: 'Receipt uploaded. Our finance team will verify your payment.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm(t('Cancel this order?'))) return;
    setBusy(true);
    try {
      await api.post(`/api/orders/${id}/cancel`);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/member/orders" className="small">
        {t("← Back to My Orders")}
      </Link>
      <h2>{order.orderNumber}</h2>
      <div className="flex gap-1 wrap mb-2">
        <span className={`badge ${statusBadgeClass(order.status)}`}>{t("Order:")} {t(order.status)}</span>
        <span className={`badge ${statusBadgeClass(order.paymentStatus)}`}>{t("Payment:")} {t(order.paymentStatus)}</span>
        <span className={`badge ${statusBadgeClass(order.shipmentStatus)}`}>{t("Shipment:")} {t(order.shipmentStatus)}</span>
      </div>
      {message && <Alert type={message.type}>{t(message.text)}</Alert>}

      <div className="panel">
        <h3>{t("Items")}</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("Product")}</th>
                <th>SKU</th>
                <th>{t("Qty")}</th>
                <th>{t("Unit Price")}</th>
                <th>{t("Total")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div>{i.productName}</div>
                    {formatVariantSelection(i.variantName, i.variantAttributes) && (
                      <div className="order-item-variant">
                        {t("Selected:")} {formatVariantSelection(i.variantName, i.variantAttributes)}
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
        </div>
        <div className="order-summary mt-2" style={{ maxWidth: 360, marginLeft: 'auto' }}>
          <div className="kv-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <div className="kv-label">{t("Subtotal")}</div>
              <div className="kv-value">{fmtMoney(order.subtotal)}</div>
            </div>
            <div>
              <div className="kv-label">{t("Discount")}</div>
              <div className="kv-value">{fmtMoney(order.discount)}</div>
            </div>
            <div>
              <div className="kv-label">{t("Shipping")}</div>
              <div className="kv-value">{fmtMoney(order.shippingFee)}</div>
            </div>
            <div>
              <div className="kv-label">{t("Total")}</div>
              <div className="kv-value" style={{ fontSize: 20, color: 'var(--brand)' }}>
                {fmtMoney(order.total)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>{t("Shipping Address")}</h3>
        <p className="small" style={{ margin: 0 }}>
          {order.shipping.name}
          <br />
          {order.shipping.street}, {order.shipping.suburb}, {order.shipping.state} {order.shipping.postcode}
          <br />
          {order.shipping.country} · {order.shipping.phone}
        </p>
      </div>

      {unpaid && payOpts && (
        <div className="panel">
          <h3>{t("Payment")}</h3>
          {payOpts.methods.includes('SANDBOX') && (
            <button className="btn btn-primary mr-1" onClick={() => pay('SANDBOX')} disabled={busy} style={{ marginRight: 8 }}>
              {t("Pay Now (Sandbox demo)")}
            </button>
          )}
          {payOpts.methods.includes('PAYPAL') && (
            <button className="btn btn-outline" onClick={() => pay('PAYPAL')} disabled={busy} style={{ marginRight: 8 }}>
              {t("Pay with PayPal")}
            </button>
          )}
          {payOpts.methods.includes('CREDIT_CARD') && (
            <button className="btn btn-outline" onClick={() => pay('CREDIT_CARD')} disabled={busy} style={{ marginRight: 8 }}>
              {t("Pay by Credit Card")}
            </button>
          )}
          {payOpts.methods.includes('BANK_TRANSFER') && (
            <div className="mt-2">
              <h4>{t("Bank Transfer")}</h4>
              <div className="kv-grid">
                <div>
                  <div className="kv-label">{t("Bank")}</div>
                  <div className="kv-value">{payOpts.bankTransfer.bankName}</div>
                </div>
                <div>
                  <div className="kv-label">BSB</div>
                  <div className="kv-value">{payOpts.bankTransfer.bsb}</div>
                </div>
                <div>
                  <div className="kv-label">{t("Account Name")}</div>
                  <div className="kv-value">{payOpts.bankTransfer.accountName}</div>
                </div>
                <div>
                  <div className="kv-label">{t("Account Number")}</div>
                  <div className="kv-value">{payOpts.bankTransfer.accountNumber}</div>
                </div>
                <div>
                  <div className="kv-label">{t("Reference")}</div>
                  <div className="kv-value">{payOpts.reference}</div>
                </div>
              </div>
              {payOpts.bankTransfer.instructions && <p className="small muted mt-1">{payOpts.bankTransfer.instructions}</p>}
              <div className="upload-box mt-2">
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
                {receiptFile && <p className="small mt-1">{receiptFile.name}</p>}
                <button className="btn btn-primary btn-sm mt-1" onClick={uploadReceipt} disabled={busy || !receiptFile}>
                  {t("Upload Receipt")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {order.shipment && (
        <div className="panel">
          <h3>{t("Shipment")}</h3>
          <div className="kv-grid">
            <div>
              <div className="kv-label">{t("Carrier")}</div>
              <div className="kv-value">{order.shipment.carrier ?? '—'}</div>
            </div>
            <div>
              <div className="kv-label">{t("Tracking Number")}</div>
              <div className="kv-value">{order.shipment.trackingNumber ?? '—'}</div>
            </div>
          </div>
          {order.shipment.trackingUrl && (
            <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm mt-1">
              {t("Track shipment")}
            </a>
          )}
        </div>
      )}

      {order.status === 'PENDING_PAYMENT' && (
        <button className="btn btn-danger btn-sm" onClick={cancel} disabled={busy}>
          {t("Cancel Order")}
        </button>
      )}

      <div className="panel mt-2">
        <h3>{t("Status History")}</h3>
        <ul className="timeline">
          {order.statusHistory.map((h, i) => (
            <li key={i}>
              <span className="badge badge-gray">{fmtDateTime(h.at)}</span>
              <span>
                {h.from ? `${t(h.from)} → ` : ''}
                <strong>{t(h.to)}</strong>
                {h.note ? ` — ${h.note}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

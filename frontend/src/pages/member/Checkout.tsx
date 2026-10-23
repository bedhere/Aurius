import { useI18n } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Cart } from '../../api/types';
import { Alert, Spinner } from '../../components/ui';
import { AU_STATES } from '../../api/types';
import { fmtMoney } from '../../utils/format';
import '../../assets/styles/pages-member.css';

interface ShipMethod {
  id: string;
  name: string;
  fee: number;
}

export default function Checkout() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [methods, setMethods] = useState<ShipMethod[]>([]);
  const [form, setForm] = useState({
    shippingName: '',
    shippingPhone: '',
    shippingStreet: '',
    shippingSuburb: '',
    shippingState: '',
    shippingPostcode: '',
    shippingCountry: 'Australia',
    shippingMethod: 'STANDARD',
    notes: '',
    referralTechId: '',
    referralEmail: '',
  });
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Cart>('/api/cart').then((c) => {
      setCart(c);
      if (c.items.length === 0) navigate('/member/cart');
    }).catch(() => navigate('/member/cart'));
    api.get<ShipMethod[]>('/api/shipping-methods').then(setMethods).catch(() => setMethods([]));
  }, [navigate]);

  if (!cart) return <Spinner />;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const shipFee = methods.find((m) => m.id === form.shippingMethod)?.fee ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const r = await api.post<{ orderId: number; orderNumber: string; total: number }>('/api/orders', {
        cartId: cart.id,
        ...form,
        referralTechId: form.referralTechId.trim() || null,
        referralEmail: form.referralEmail.trim() || null,
      });
      navigate(`/member/orders/${r.orderId}`);
    } catch (err) {
      const error = err as ApiError;
      const details = error.errors?.map((item) => `${item.field ? `${item.field}: ` : ''}${item.message}`).join('; ');
      setMessage({ type: 'error', text: details ? `${error.message}: ${details}` : error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2>{t("Checkout")}</h2>
      {message && <Alert type={message.type}>{t(message.text)}</Alert>}

      <form onSubmit={submit}>
        <div className="panel">
          <h3>{t("Shipping Address")}</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>{t("Contact Name")}</label>
              <input type="text" value={form.shippingName} onChange={set('shippingName')} required />
            </div>
            <div className="field">
              <label>{t("Phone")}</label>
              <input type="tel" value={form.shippingPhone} onChange={set('shippingPhone')} required />
            </div>
            <div className="field">
              <label>{t("Street")}</label>
              <input type="text" value={form.shippingStreet} onChange={set('shippingStreet')} required />
            </div>
            <div className="field">
              <label>{t("Suburb")}</label>
              <input type="text" value={form.shippingSuburb} onChange={set('shippingSuburb')} required />
            </div>
            <div className="field">
              <label>{t("State")}</label>
              <select value={form.shippingState} onChange={set('shippingState')} required>
                <option value="">{t("Select…")}</option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>
                    {t(`stockists.state.${s}`)} ({s})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("Postcode")}</label>
              <input type="text" value={form.shippingPostcode} onChange={set('shippingPostcode')} required />
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>{t("Shipping Method")}</h3>
          {methods.map((m) => (
            <label key={m.id} className="checkbox-row" style={{ padding: '8px 0' }}>
              <input type="radio" name="method" value={m.id} checked={form.shippingMethod === m.id} onChange={set('shippingMethod')} />
              <span>
                {t(m.name)} — {m.fee === 0 ? t("Free") : fmtMoney(m.fee)}
              </span>
            </label>
          ))}
        </div>

        <div className="panel">
          <h3>{t("Order Notes & Referral")}</h3>
          <div className="field">
            <label>{t("Order Notes (optional)")}</label>
            <textarea value={form.notes} onChange={set('notes')} />
          </div>
          <div className="form-grid-2">
            <div className="field">
              <label>{t("Referral Technician ID (optional)")}</label>
              <input type="text" placeholder={t("e.g. AUR-TR-2026000365")} value={form.referralTechId} onChange={set('referralTechId')} />
            </div>
            <div className="field">
              <label>{t("Referral Email (optional)")}</label>
              <input type="email" value={form.referralEmail} onChange={set('referralEmail')} />
            </div>
          </div>
        </div>

        <div className="order-summary">
          <h3 style={{ marginBottom: 12 }}>{t("Order Summary")}</h3>
          {cart.items.map((i) => (
            <div className="flex items-center" key={i.id} style={{ justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
              <span>
                {i.name} × {i.quantity}
              </span>
              <span>{fmtMoney(i.lineTotal)}</span>
            </div>
          ))}
          <div className="flex items-center" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--stone-200)', marginTop: 10, paddingTop: 10 }}>
            <span>{t("Subtotal")}</span>
            <span>{fmtMoney(cart.subtotal)}</span>
          </div>
          <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
            <span>{t("Shipping")}</span>
            <span>{fmtMoney(shipFee)}</span>
          </div>
          <div className="flex items-center" style={{ justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
            <span>{t("Total")}</span>
            <span>{fmtMoney(cart.subtotal + shipFee)}</span>
          </div>
          <p className="small muted mt-1" style={{ margin: '8px 0 0' }}>
            {t("Final prices are calculated by AURIUS. You will confirm payment on the next step.")}
          </p>
        </div>

        <button className="btn btn-primary btn-lg mt-2" type="submit" disabled={busy}>
          {busy ? t("Placing order…") : t("Place Order")}
        </button>
      </form>
    </>
  );
}

import { useI18n } from '../../i18n/LanguageContext';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Alert, Spinner } from '../../components/ui';
import { AU_STATES, GuestCheckoutInput, GuestOrderResult, money, ProductItem } from '../../api/types';
import '../../assets/styles/pages-member.css';

interface ShipMethod {
  id: string;
  name: string;
  fee: number;
}

export default function GuestCheckout() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const productId = Number(params.get('productId') || '0');
  const returnedOrderId = Number(params.get('orderId') || '0');
  const returnedToken = params.get('token') || '';
  const variantId = Number(params.get('variantId') || '0') || null;
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [methods, setMethods] = useState<ShipMethod[]>([]);
  const [order, setOrder] = useState<GuestOrderResult | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<GuestCheckoutInput>({
    productId,
    quantity: 1,
    variantId,
    guestEmail: '',
    guestPhone: '',
    shippingName: '',
    shippingPhone: '',
    shippingStreet: '',
    shippingSuburb: '',
    shippingState: '',
    shippingPostcode: '',
    shippingCountry: 'Australia',
    shippingMethod: 'STANDARD',
    notes: '',
  });

  useEffect(() => {
    api.get<ShipMethod[]>('/api/shipping-methods').then((availableMethods) => {
      setMethods(availableMethods);
      if (availableMethods.length > 0 && !availableMethods.some((method) => method.id === form.shippingMethod)) {
        setForm((current) => ({ ...current, shippingMethod: availableMethods[0].id }));
      }
    }).catch(() => setMethods([]));
    if (productId) {
      api.get<ProductItem>(`/api/products/${productId}`).then(setProduct).catch(() => setProduct(null));
    }
    if (returnedOrderId && returnedToken) {
      api.get<{ methods: string[]; orderNumber: string; total: number; bankTransfer: Record<string, string>; reference: string }>(
        `/api/guest-orders/${returnedOrderId}/${returnedToken}/payment-options`,
      )
        .then((r) => {
          setOrder({ orderId: returnedOrderId, orderNumber: r.orderNumber, total: r.total, guestToken: returnedToken });
        })
        .catch(() => undefined);
    }
  }, [productId, returnedOrderId, returnedToken]);

  const selectedMethodFee = useMemo(() => methods.find((m) => m.id === form.shippingMethod)?.fee ?? 0, [methods, form.shippingMethod]);
  const orderTotal = order ? order.total : 0;

  const set = (k: keyof GuestCheckoutInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [k]: k === 'quantity' || k === 'productId' || k === 'variantId' ? Number(e.target.value) : e.target.value });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPaymentMessage(null);
    try {
      const r = await api.post<GuestOrderResult>('/api/guest-checkout', form);
      setOrder(r);
    } catch (err) {
      setPaymentMessage((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const pay = async (method: 'PAYPAL' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'SANDBOX') => {
    if (!order) return;
    setBusy(true);
    setPaymentMessage(null);
    try {
      const r = await api.post<{ checkoutUrl?: string | null; approvalUrl?: string | null; reference?: string; bank?: unknown }>(
        `/api/guest-orders/${order.orderId}/${order.guestToken}/pay`,
        { method },
      );
      const url = r.checkoutUrl ?? r.approvalUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setPaymentMessage(`${t('Payment method ready. Reference:')} ${r.reference ?? order.orderNumber}`);
    } catch (err) {
      setPaymentMessage((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (productId && !product) return <Spinner />;

  return (
    <section className="section">
      <div className="container">
        <Link to={product ? `/products/${product.id}` : '/products'} className="small">{t("Back")}</Link>
        <h2 className="mt-2">{t("Guest Checkout")}</h2>
        {paymentMessage && <Alert type="info">{paymentMessage}</Alert>}
        {!order ? (
          <form onSubmit={submit} className="panel">
            <div className="form-grid-2">
              <div className="field"><label>{t("Email")}</label><input value={form.guestEmail} onChange={set('guestEmail')} required /></div>
              <div className="field"><label>{t("Phone")}</label><input value={form.guestPhone ?? ''} onChange={set('guestPhone')} /></div>
              <div className="field"><label>{t("Contact Name")}</label><input value={form.shippingName} onChange={set('shippingName')} required /></div>
              <div className="field"><label>{t("Contact Phone")}</label><input value={form.shippingPhone} onChange={set('shippingPhone')} required /></div>
              <div className="field"><label>{t("Street")}</label><input value={form.shippingStreet} onChange={set('shippingStreet')} required /></div>
              <div className="field"><label>{t("Suburb")}</label><input value={form.shippingSuburb} onChange={set('shippingSuburb')} required /></div>
              <div className="field"><label>{t("State")}</label><select value={form.shippingState} onChange={set('shippingState')} required>{AU_STATES.map((s) => <option key={s} value={s}>{t(`stockists.state.${s}`)} ({s})</option>)}</select></div>
              <div className="field"><label>{t("Postcode")}</label><input value={form.shippingPostcode} onChange={set('shippingPostcode')} required /></div>
            </div>
            <div className="field mt-2"><label>{t("Notes")}</label><textarea value={form.notes ?? ''} onChange={set('notes')} /></div>
            <div className="field mt-2">
              <label>{t("Shipping method")}</label>
              <select value={form.shippingMethod} onChange={set('shippingMethod')} required>
                {methods.map((method) => <option key={method.id} value={method.id}>{t(method.name)} ({money(method.fee)})</option>)}
              </select>
            </div>
            <button className="btn btn-primary mt-2" disabled={busy}>{busy ? t("Creating…") : t("Create Order")}</button>
          </form>
        ) : (
          <div className="panel">
            <p>{t("Order")} <strong>{order.orderNumber}</strong> {t("created.")}</p>
            <p>{t("Total:")} {money(orderTotal)}</p>
            <p>{t("Shipping method fee:")} {money(selectedMethodFee)}</p>
            <div className="flex gap-1 wrap mt-2">
              <button className="btn btn-primary" onClick={() => pay('CREDIT_CARD')} disabled={busy}>{t("Pay by Card")}</button>
              <button className="btn btn-outline" onClick={() => pay('PAYPAL')} disabled={busy}>{t("Pay by PayPal")}</button>
              <button className="btn btn-outline" onClick={() => pay('BANK_TRANSFER')} disabled={busy}>{t("Bank Transfer")}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

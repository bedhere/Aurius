import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useI18n } from '../i18n/LanguageContext';
import { Alert } from './ui';

const INITIAL = { name: '', phone: '', email: '', productModel: '', purchaseDate: '', orderNumber: '', message: '' };

export function SupportRequestForm() {
  const { t } = useI18n();
  const [form, setForm] = useState(INITIAL);
  const [proof, setProof] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const set = (key: keyof typeof INITIAL) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (images.length > 4 || [proof, ...images].some((file) => file && file.size > 10 * 1024 * 1024)) { setError('Upload up to 4 photos, with each file no larger than 10 MB.'); return; }
    setBusy(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (proof) data.append('proof', proof);
      images.forEach((file) => data.append('images', file));
      const result = await api.postForm<{ reference: string }>('/api/support/requests', data);
      setReference(result.reference); setForm(INITIAL); setProof(null); setImages([]);
    } catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  }
  if (reference) return <div className="form-card enquiry-success" role="status"><h3>{t('Your support request has been received.')}</h3><p>{t('Request reference')}: <strong>{reference}</strong></p><p>{t('Our team will review your request and contact you. Please keep your reference number.')}</p><button className="btn btn-outline" onClick={() => setReference('')}>{t('Submit another request')}</button></div>;
  return <form className="form-card enquiry-form" onSubmit={submit} aria-busy={busy}>
    <h3>{t('After-Sales Request')}</h3><p className="muted small">{t('Required fields are marked with an asterisk (*).')}</p>
    {error && <Alert type="error">{error}</Alert>}
    <fieldset disabled={busy}>
      <div className="field"><label htmlFor="support-name">{t('Full Name *')}</label><input id="support-name" autoComplete="name" value={form.name} onChange={set('name')} maxLength={200} required /></div>
      <div className="form-grid-2">
        <div className="field"><label htmlFor="support-email">{t('Email Address *')}</label><input id="support-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} maxLength={254} required /></div>
        <div className="field"><label htmlFor="support-phone">{t('Phone Number *')}</label><input id="support-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} minLength={6} maxLength={30} required /></div>
      </div>
      <div className="form-grid-2">
        <div className="field"><label htmlFor="support-model">{t('Product model *')}</label><input id="support-model" value={form.productModel} onChange={set('productModel')} maxLength={200} required /></div>
        <div className="field"><label htmlFor="support-date">{t('Purchase date *')}</label><input id="support-date" type="date" max={new Date().toISOString().slice(0, 10)} value={form.purchaseDate} onChange={set('purchaseDate')} required /></div>
      </div>
      <div className="field"><label htmlFor="support-order">{t('Order number')}</label><input id="support-order" value={form.orderNumber} onChange={set('orderNumber')} maxLength={200} /><p className="hint">{t('Provide an order number or upload proof of purchase below.')}</p></div>
      <div className="field"><label htmlFor="support-proof">{t('Proof of purchase')}{!form.orderNumber.trim() && ' *'}</label><input id="support-proof" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setProof(event.target.files?.[0] ?? null)} required={!form.orderNumber.trim()} /><p className="hint">{t('PDF, JPG or PNG, up to 10 MB.')}</p></div>
      <div className="field"><label htmlFor="support-message">{t('Fault description *')}</label><textarea id="support-message" rows={5} value={form.message} onChange={set('message')} maxLength={6000} required /></div>
      <div className="field"><label htmlFor="support-images">{t('Fault photos (Optional)')}</label><input id="support-images" type="file" accept=".jpg,.jpeg,.png" multiple onChange={(event) => setImages(Array.from(event.target.files ?? []))} /><p className="hint">{t('Upload up to 4 photos, with each file no larger than 10 MB.')}</p></div>
      <p className="small muted">{t('Your details will be used to respond to your enquiry in accordance with our')} <Link to="/privacy-policy">{t('Privacy Policy')}</Link>.</p>
      <button className="btn btn-primary btn-lg" type="submit">{t(busy ? 'Sending…' : 'Submit Support Request')}</button>
    </fieldset>
  </form>;
}

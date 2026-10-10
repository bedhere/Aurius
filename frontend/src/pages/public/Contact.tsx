import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { useI18n } from '../../i18n/LanguageContext';

interface CompanyInfo { phone: string; email: string; address: string; hours: string; }

export default function Contact() {
  const { t } = useI18n();
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => { api.get<CompanyInfo>('/api/company-info').then(setInfo).catch(() => undefined); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true); setStatus(null);
    try { await api.post('/api/contact', form); setStatus({ type: 'success', text: t('contact.success') }); setForm({ name: '', email: '', phone: '', message: '' }); }
    catch (err) { setStatus({ type: 'error', text: (err as ApiError).message }); } finally { setSending(false); }
  };
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  return <>
    <section className="page-band"><div className="container"><h1 className="section-title">{t('contact.title')}</h1><p className="section-sub">{t('contact.sub')}</p></div></section>
    <section className="section"><div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, maxWidth: 960 }}>
      <div><h2>{t('contact.getInTouch')}</h2>{info && <div className="kv-grid">
        <div><div className="kv-label">{t('contact.phone')}</div><div className="kv-value">{info.phone}</div></div>
        <div><div className="kv-label">{t('contact.email')}</div><div className="kv-value">{info.email}</div></div>
        <div><div className="kv-label">{t('contact.address')}</div><div className="kv-value">{info.address}</div></div>
        <div><div className="kv-label">{t('contact.hours')}</div><div className="kv-value">{info.hours}</div></div>
      </div>}</div>
      <form className="form-card" onSubmit={submit}><h3>{t('contact.send')}</h3>{status && <Alert type={status.type}>{status.text}</Alert>}
        <div className="field"><label>{t('contact.name')} <span className="req">*</span></label><input type="text" value={form.name} onChange={set('name')} required /></div>
        <div className="field"><label>{t('contact.email')} <span className="req">*</span></label><input type="email" value={form.email} onChange={set('email')} required /></div>
        <div className="field"><label>{t('contact.phone')}</label><input type="tel" value={form.phone} onChange={set('phone')} /></div>
        <div className="field"><label>{t('contact.message')} <span className="req">*</span></label><textarea value={form.message} onChange={set('message')} required /></div>
        <button className="btn btn-primary" type="submit" disabled={sending}>{sending ? t('contact.sending') : t('contact.sendMessage')}</button>
      </form>
    </div></section>
  </>;
}

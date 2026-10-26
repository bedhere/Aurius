import { useI18n } from '../../i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { AU_STATES } from '../../api/types';
import { Alert } from '../../components/ui';
import '../../assets/styles/pages-public.css';

interface CompanyInfo { phone?: string; email?: string; address?: string; hours?: string; website?: string; }
const INITIAL_FORM = { name: '', companyName: '', email: '', phone: '', state: '', enquiryType: 'General Enquiries', message: '' };
const ENQUIRY_TYPES = [
  ['General Enquiries', 'For product information, general questions and assistance with AURIUS solutions.'],
  ['Product Enquiries', 'For help choosing a product or checking availability.'],
  ['Trade & Business Enquiries', 'For enquiries from plumbers, builders, distributors and other business customers.'],
  ['Technical Support', 'For installation guidance and technical product assistance.'],
  ['Warranty & After-Sales', 'For warranty enquiries and after-sales assistance.'],
];

export default function Contact() {
  const { t } = useI18n();
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => { api.get<CompanyInfo>('/api/company-info').then(setInfo).catch(() => undefined); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSending(true); setStatus(null);
    try {
      await api.post('/api/contact', form);
      setStatus({ type: 'success', text: 'Your enquiry has been received. Our team will review your message and respond as soon as possible.' });
      setForm(INITIAL_FORM);
    } catch (err) {
      const failure = err as ApiError;
      setStatus({ type: 'error', text: failure.errors?.map((item) => t(item.message)).join(' ') || failure.message });
    } finally { setSending(false); }
  };
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });
  return <>
    <section className="page-band"><div className="container"><h1 className="section-title">{t("Contact AURIUS")}</h1><p className="section-sub">{t("We're here to assist with product enquiries, professional partnerships and customer support.")}</p></div></section>
    <section className="section"><div className="container enquiry-layout">
      <div className="enquiry-intro">
        {ENQUIRY_TYPES.map(([title, text]) => <article className="contact-direction" key={title}><h2>{t(title)}</h2><p>{t(text)}</p></article>)}
        <div className="contact-company">
          <h2>AURIUS AU Pty Ltd</h2>
          <a href="mailto:info@aurius.com.au">info@aurius.com.au</a>
          {info?.phone && <p><a href={`tel:${info.phone.replace(/\s/g, '')}`}>{info.phone}</a></p>}
          {info?.address && <p>{info.address}</p>}
          {info?.hours && <p>{info.hours}</p>}
          <p><a href="https://www.aurius.com.au">www.aurius.com.au</a></p>
        </div>
      </div>
      {status?.type === 'success' ? <div className="form-card enquiry-success" role="status"><h2>{t("Thank You for Contacting AURIUS")}</h2><p>{t(status.text)}</p><button type="button" className="btn btn-outline" onClick={() => setStatus(null)}>{t("Send Another Enquiry")}</button></div> : <form className="form-card enquiry-form" onSubmit={submit} aria-busy={sending}>
        <h3>{t("Send an Enquiry")}</h3>
        {status && <Alert type={status.type}>{status.text}</Alert>}
        <fieldset disabled={sending}>
          <div className="field"><label htmlFor="contact-name">{t("Full Name *")}</label><input id="contact-name" autoComplete="name" maxLength={200} value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label htmlFor="contact-company">{t("Company Name (Optional)")}</label><input id="contact-company" autoComplete="organization" maxLength={200} value={form.companyName} onChange={set('companyName')} /></div>
          <div className="form-grid-2">
            <div className="field"><label htmlFor="contact-email">{t("Email Address *")}</label><input id="contact-email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={set('email')} required /></div>
            <div className="field"><label htmlFor="contact-phone">{t("Phone Number *")}</label><input id="contact-phone" type="tel" autoComplete="tel" minLength={6} maxLength={30} value={form.phone} onChange={set('phone')} required /></div>
          </div>
          <div className="form-grid-2">
            <div className="field"><label htmlFor="contact-state">{t("State / Territory *")}</label><select id="contact-state" autoComplete="address-level1" value={form.state} onChange={set('state')} required><option value="">{t("Select state / territory")}</option>{AU_STATES.map((state) => <option key={state} value={state}>{t(`stockists.state.${state}`)} ({state})</option>)}</select></div>
            <div className="field"><label htmlFor="contact-type">{t("Enquiry Type *")}</label><select id="contact-type" value={form.enquiryType} onChange={set('enquiryType')}>{ENQUIRY_TYPES.map(([type]) => <option key={type} value={type}>{t(type)}</option>)}</select></div>
          </div>
          <div className="field"><label htmlFor="contact-message">{t("Message *")}</label><textarea id="contact-message" rows={5} maxLength={6000} value={form.message} onChange={set('message')} required /></div>
          <p className="muted small">{t("Your details will be used to respond to your enquiry in accordance with our")} <Link to="/privacy-policy">{t("Privacy Policy")}</Link>.</p>
          <button className="btn btn-primary btn-lg" type="submit">{sending ? t("Sending…") : t("Send Enquiry")}</button>
        </fieldset>
      </form>}
    </div></section>
  </>;
}

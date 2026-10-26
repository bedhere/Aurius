import { useI18n } from '../../i18n/LanguageContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { AU_STATES } from '../../api/types';
import { Alert } from '../../components/ui';
import '../../assets/styles/pages-public.css';

const PRODUCT_CATEGORIES = ['Smart Toilets', 'Smart Toilet Seats', 'Whole House Water Filtration', 'Filter Cartridges', 'Custom Floor Drains'];
const INITIAL_FORM = {
  companyName: '', abn: '', yearsInBusiness: '', existingSalesNetwork: '', partnershipType: '', currentAnnualSales: '', state: '', city: '', businessOverview: '', interestedProducts: [] as string[],
  intendedTerritory: '', expectedAnnualSales: '', contactName: '', phone: '', website: '', email: '',
};
const BENEFITS = [
  ['A Growing Product Portfolio', 'Explore opportunities across our smart bathroom and whole-house water filtration product ranges.'],
  ['Regional Market Development', 'Build your business within an agreed territory, supported by a structured distribution strategy.'],
  ['Long-Term Business Relationships', 'We value professionalism, market knowledge, customer service and sustainable business growth.'],
  ['Professional Product Support', 'Access relevant product information, technical resources and business support.'],
];

export default function BecomePartner() {
  const { t } = useI18n();
  const [form, setForm] = useState(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productError, setProductError] = useState(false);
  const set = (key: Exclude<keyof typeof form, 'interestedProducts'>) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.interestedProducts.length) { setProductError(true); document.getElementById('partner-product-0')?.focus(); return; }
    setBusy(true); setError(null);
    try {
      await api.post('/api/partnership-enquiries', form);
      setSent(true); setForm(INITIAL_FORM);
    } catch (err) {
      const failure = err as ApiError;
      setError(failure.errors?.map((item) => t(item.message)).join(' ') || failure.message);
    } finally { setBusy(false); }
  };

  return <>
    <section className="page-band"><div className="container">
      <h1 className="section-title">{t("Become an AURIUS Partner")}</h1>
      <p className="section-sub">{t("Build a Stronger Future Together")}</p>
    </div></section>
    <section className="section"><div className="container partnership-intro">
      <p>{t("AURIUS is building a professional distribution network across Australia, connecting quality products with capable and committed business partners.")}</p>
      <p>{t("We welcome established distributors and businesses with strong local market knowledge, industry experience and the ambition to develop long-term partnerships.")}</p>
      <a href="#partnership-application" className="btn btn-primary">{t("Apply to Become a Partner")}</a>
    </div></section>
    <section className="section section-alt"><div className="container">
      <h2 className="section-title">{t("Why Partner with AURIUS?")}</h2>
      <div className="partnership-benefits">{BENEFITS.map(([title, text]) => <article key={title}><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div>
    </div></section>
    <section className="section" id="partnership-application"><div className="container enquiry-layout">
      <div className="enquiry-intro">
        <h2>{t("Apply to Become a Partner")}</h2>
        <p>{t("Tell us about your business, market experience and preferred territory. Our team will review your application and contact you to discuss potential opportunities.")}</p>
        <p className="muted">{t("Partnership applications are reviewed individually by AURIUS.")}</p>
        <p><a href="mailto:info@aurius.com.au">info@aurius.com.au</a></p>
      </div>
      {sent ? <div className="form-card enquiry-success" role="status">
        <h2>{t("Thank You for Your Partnership Enquiry")}</h2>
        <p>{t("Your enquiry has been received. Our team will review your business details and contact you to discuss potential opportunities.")}</p>
        <Link to="/products" className="btn btn-outline">{t("Explore the AURIUS Collection")}</Link>
      </div> : <form className="form-card enquiry-form" onSubmit={submit} aria-busy={busy}>
        <h3>{t("Partnership Enquiry")}</h3>
        <p className="muted small">{t("Required fields are marked with an asterisk (*).")}</p>
        {error && <Alert type="error">{error}</Alert>}
        <fieldset disabled={busy}>
          <div className="field"><label htmlFor="partner-company">{t("Company Name *")}</label><input id="partner-company" autoComplete="organization" maxLength={200} value={form.companyName} onChange={set('companyName')} required /></div>
          <div className="form-grid-2">
            <div className="field"><label htmlFor="partner-abn">{t("Company ABN *")}</label><input id="partner-abn" inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} title={t("ABN must be exactly 11 digits")} value={form.abn} onChange={set('abn')} required /></div>
            <div className="field"><label htmlFor="partner-years">{t("Years in Business (Optional)")}</label><input id="partner-years" type="number" min="0" max="999" step="1" value={form.yearsInBusiness} onChange={set('yearsInBusiness')} /></div>
          </div>
          <div className="field"><label htmlFor="partner-type">{t("Preferred Partnership Type *")}</label><select id="partner-type" value={form.partnershipType} onChange={set('partnershipType')} required><option value="">{t("Select partnership type")}</option>{['Regional Distributor', 'Dealer / Reseller', 'Other Business Partnership'].map((value) => <option value={value} key={value}>{t(value)}</option>)}</select></div>
          <div className="form-grid-2">
            <div className="field"><label htmlFor="partner-state">{t("State / Territory *")}</label><select id="partner-state" autoComplete="address-level1" value={form.state} onChange={set('state')} required><option value="">{t("Select state / territory")}</option>{AU_STATES.map((state) => <option key={state} value={state}>{t(`stockists.state.${state}`)} ({state})</option>)}</select></div>
            <div className="field"><label htmlFor="partner-city">{t("City *")}</label><input id="partner-city" autoComplete="address-level2" maxLength={100} value={form.city} onChange={set('city')} required /></div>
          </div>
          <div className="field"><label htmlFor="partner-overview">{t("Current Product Categories & Business Overview *")}</label><textarea id="partner-overview" maxLength={4000} rows={4} placeholder={t("Tell us what your company currently sells and how your business operates.")} value={form.businessOverview} onChange={set('businessOverview')} required /></div>
          <fieldset className="field product-interests" aria-describedby={productError ? 'partner-products-error' : undefined}>
            <legend>{t("Products of Interest *")}</legend>
            {PRODUCT_CATEGORIES.map((category, index) => <label className="checkbox-row" key={category} htmlFor={`partner-product-${index}`}><input id={`partner-product-${index}`} type="checkbox" checked={form.interestedProducts.includes(category)} onChange={(event) => {
              setProductError(false);
              setForm((current) => ({ ...current, interestedProducts: event.target.checked ? [...current.interestedProducts, category] : current.interestedProducts.filter((value) => value !== category) }));
            }} />{t(category)}</label>)}
            {productError && <p className="field-error" id="partner-products-error" role="alert">{t("Select at least one product category.")}</p>}
          </fieldset>
          <div className="field"><label htmlFor="partner-territory">{t("Preferred Trading Territory *")}</label><input id="partner-territory" maxLength={500} placeholder={t("State, city or region you would like to serve")} value={form.intendedTerritory} onChange={set('intendedTerritory')} required /></div>
          <div className="field"><label htmlFor="partner-network">{t("Existing Sales Network (Optional)")}</label><textarea id="partner-network" rows={3} maxLength={2000} placeholder={t("Describe your stores, dealers, and relationships with plumbers and builders, including approximate numbers.")} value={form.existingSalesNetwork} onChange={set('existingSalesNetwork')} /></div>
          <div className="field"><label htmlFor="partner-current-sales">{t("Current Annual Sales Volume (Optional)")}</label><textarea id="partner-current-sales" rows={2} maxLength={1000} placeholder={t("Current units sold per year, by product category. Approximate figures are welcome.")} value={form.currentAnnualSales} onChange={set('currentAnnualSales')} /></div>
          <div className="field"><label htmlFor="partner-sales">{t("Estimated Annual Sales Volume (Optional)")}</label><textarea id="partner-sales" rows={2} maxLength={1000} placeholder={t("Estimated units per year; please specify the product category for each estimate.")} value={form.expectedAnnualSales} onChange={set('expectedAnnualSales')} /></div>
          <div className="form-grid-2">
            <div className="field"><label htmlFor="partner-name">{t("Contact Name *")}</label><input id="partner-name" autoComplete="name" maxLength={200} value={form.contactName} onChange={set('contactName')} required /></div>
            <div className="field"><label htmlFor="partner-phone">{t("Mobile Number *")}</label><input id="partner-phone" type="tel" autoComplete="tel" minLength={6} maxLength={30} value={form.phone} onChange={set('phone')} required /></div>
          </div>
          <div className="field"><label htmlFor="partner-website">{t("Company Website (Optional)")}</label><input id="partner-website" type="text" inputMode="url" autoComplete="url" placeholder="www.example.com.au" maxLength={300} value={form.website} onChange={set('website')} /></div>
          <div className="field"><label htmlFor="partner-email">{t("Company Email *")}</label><input id="partner-email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={set('email')} required /></div>
          <p className="muted small">{t("Your details will be used to respond to your enquiry in accordance with our")} <Link to="/privacy-policy">{t("Privacy Policy")}</Link>.</p>
          <p className="application-disclaimer">{t("Submission of an enquiry does not constitute appointment as an authorised AURIUS partner. All partnerships are subject to review and formal approval.")}</p>
          <button type="submit" className="btn btn-primary btn-lg">{busy ? t("Sending Enquiry…") : t("Submit Partnership Enquiry")}</button>
        </fieldset>
      </form>}
    </div></section>
  </>;
}

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { AU_STATES, COUNTRIES } from '../../api/types';
import '../../assets/styles/pages-auth.css';

type Channel = 'VIP' | 'TRADE';

interface RegForm {
  partnershipType: string;
  intendedTerritory: string;
  tradeType: string;
  state: string;
  licenceType: string;
  licenceNumber: string;
  firstName: string;
  lastName: string;
  companyName: string;
  streetAddress: string;
  suburb: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  yearsExperience: string;
  smartToiletExp: string;
  waterPurifExp: string;
  additionalNotes: string;
  abnNumber: string;
  businessInterest: string[];
  password: string;
  confirmPassword: string;
  privacyConsent: boolean;
  dealerAgreement: boolean;
  marketingConsent: boolean;
}

const emptyForm: RegForm = {
  partnershipType: 'DEALER',
  intendedTerritory: '',
  tradeType: '',
  state: '',
  licenceType: '',
  licenceNumber: '',
  firstName: '',
  lastName: '',
  companyName: '',
  streetAddress: '',
  suburb: '',
  postcode: '',
  country: 'Australia',
  email: '',
  phone: '',
  website: '',
  yearsExperience: '',
  smartToiletExp: '',
  waterPurifExp: '',
  additionalNotes: '',
  abnNumber: '',
  businessInterest: [],
  password: '',
  confirmPassword: '',
  privacyConsent: false,
  dealerAgreement: false,
  marketingConsent: false,
};

const YEARS = [
  { label: 'Less than 2 years', value: '1' },
  { label: '2-5 years', value: '3' },
  { label: '5-10 years', value: '8' },
  { label: 'More than 10 years', value: '12' },
];

const EXP_LEVELS = [
  'No experience',
  'Basic experience (1-5 units)',
  'Experienced (6+ units)',
  'Expert (regular installations)',
];

export default function Portal({ channel }: { channel: Channel }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPartnership = channel === 'VIP' ? 'TRADE_PROFESSIONAL'
    : searchParams.get('partner') === 'regional-distributor' ? 'REGIONAL_DISTRIBUTOR' : 'DEALER';
  const [tab, setTab] = useState<'login' | 'register'>(() => searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [step, setStep] = useState(1);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [reg, setReg] = useState<RegForm>({ ...emptyForm, partnershipType: initialPartnership });
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [siteKey, setSiteKey] = useState('');
  const recaptchaInjected = useRef(false);

  const isVIP = channel === 'VIP';
  const isRegional = !isVIP && reg.partnershipType === 'REGIONAL_DISTRIBUTOR';

  useEffect(() => {
    setTab(searchParams.get('tab') === 'register' ? 'register' : 'login');
    setReg({ ...emptyForm, partnershipType: initialPartnership });
    setStep(1);
    setErrors({});
    setError(null);
    setSuccess(null);
    setLicenceFile(null);
  }, [channel, searchParams, initialPartnership]);

  useEffect(() => {
    api
      .get<{ recaptchaSiteKey: string }>('/api/config')
      .then((c) => {
        setSiteKey(c.recaptchaSiteKey ?? '');
        if (c.recaptchaSiteKey && !recaptchaInjected.current) {
          recaptchaInjected.current = true;
          const s = document.createElement('script');
          s.src = 'https://www.google.com/recaptcha/api.js';
          s.async = true;
          document.head.appendChild(s);
        }
      })
      .catch(() => undefined);
  }, []);

  const set = (k: keyof RegForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setReg({ ...reg, [k]: e.target.value });
  };

  const toggleInterest = (v: string) => {
    const cur = reg.businessInterest;
    setReg({
      ...reg,
      businessInterest: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    });
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await login(loginForm.email, loginForm.password);
      if (me?.role === 'ADMIN') navigate('/admin');
      else navigate('/member');
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (isRegional && !reg.intendedTerritory.trim()) errs.intendedTerritory = 'Please specify your intended distribution territory';
      if (isVIP && !reg.tradeType) errs.tradeType = 'Trade type is required';
      if (!reg.state) errs.state = 'State/territory is required';
      if (isVIP && !reg.licenceType) errs.licenceType = 'Licence type is required';
      if (isVIP && !reg.licenceNumber.trim()) errs.licenceNumber = 'Licence number is required';
    }
    if (s === 2) {
      if (!reg.firstName.trim()) errs.firstName = 'First name is required';
      if (!reg.lastName.trim()) errs.lastName = 'Last name is required';
      if (!reg.companyName.trim()) errs.companyName = 'Company name is required';
      if (!reg.streetAddress.trim()) errs.streetAddress = 'Street is required';
      if (!reg.suburb.trim()) errs.suburb = 'Suburb is required';
      if (!reg.postcode.trim()) errs.postcode = 'Postcode is required';
      if (!reg.phone.trim()) errs.phone = 'Phone number is required';
    }
    if (s === 3) {
      if (!/^\S+@\S+\.\S+$/.test(reg.email)) errs.email = 'A valid email is required';
      const pw = reg.password;
      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
        errs.password = 'Must be 8+ chars with upper, lower, number and special character';
      }
      if (pw !== reg.confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (reg.abnNumber && !/^\d{11}$/.test(reg.abnNumber)) errs.abnNumber = 'ABN must be exactly 11 digits';
      if (reg.businessInterest.length === 0) errs.businessInterest = 'Select at least one category';
      if (!reg.privacyConsent) errs.privacyConsent = 'You must accept the Privacy Policy and Terms of Service';
      if (!reg.dealerAgreement) errs.dealerAgreement = 'You must accept the Dealer Agreement';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const getRecaptchaToken = (): string | undefined => {
    const w = window as unknown as { grecaptcha?: { getResponse: () => string } };
    return w.grecaptcha?.getResponse() || undefined;
  };

  const submitReg = async () => {
    if (!validateStep(3)) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const payload = {
      channel,
      partnershipType: reg.partnershipType,
      intendedTerritory: isRegional ? reg.intendedTerritory.trim() : null,
      email: reg.email,
      tradeType: isVIP ? reg.tradeType : 'NOT_APPLICABLE',
      state: reg.state,
      licenceType: isVIP ? (reg.licenceType || null) : reg.licenceType || null,
      licenceNumber: reg.licenceNumber.trim() || null,
      firstName: reg.firstName,
      lastName: reg.lastName,
      companyName: reg.companyName,
      streetAddress: reg.streetAddress,
      suburb: reg.suburb,
      postcode: reg.postcode,
      country: reg.country,
      phone: reg.phone,
      website: reg.website.trim() || null,
      socialMedia: null,
      abnNumber: reg.abnNumber.trim() || null,
      yearsExperience: reg.yearsExperience ? parseInt(reg.yearsExperience, 10) : null,
      smartToiletExp: isVIP ? reg.smartToiletExp || null : null,
      waterPurifExp: isVIP ? reg.waterPurifExp || null : null,
      additionalNotes: reg.additionalNotes.trim() || null,
      businessInterest: reg.businessInterest,
      privacyConsent: reg.privacyConsent,
      dealerAgreement: reg.dealerAgreement,
      marketingConsent: reg.marketingConsent,
      password: reg.password,
      confirmPassword: reg.confirmPassword,
      recaptchaToken: getRecaptchaToken(),
    };
    try {
      await api.post('/api/applications', payload);
      if (licenceFile) {
        try {
          await login(reg.email, reg.password);
          const fd = new FormData();
          fd.append('file', licenceFile);
          await api.postForm('/api/applications/me/licence-file', fd);
        } catch {
          /* registration still succeeded; file upload can be completed later */
        }
      }
      setSuccess('Application submitted. Our team will review your qualifications. You can track the status in the member centre.');
      setReg({ ...emptyForm, partnershipType: initialPartnership });
      setStep(1);
    } catch (err) {
      const apiErr = err as ApiError;
      const validationMessages = apiErr.errors.map((fe) => fe.message);
      setError([apiErr.message, ...validationMessages].join(': '));
      if (apiErr.errors?.length) {
        const fieldErrors: Record<string, string> = {};
        apiErr.errors.forEach((fe) => {
          if (fe.field) fieldErrors[fe.field] = fe.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldErr = (k: string) => (errors[k] ? <span className="error-text">{errors[k]}</span> : null);

  return (
    <section className="section">
      <div className={`auth-wrap ${tab === 'register' ? 'wide' : ''}`}>
        <div className="center mb-2">
          <h2 className="section-title">{isVIP ? 'Trade Professional Portal' : isRegional ? 'Regional Distributor Application' : 'Trade Partner Portal'}</h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {isVIP
              ? 'For licensed Australian plumbers and electricians only.'
              : isRegional ? 'Apply to become an authorised AURIUS regional distributor. All territories are subject to review and approval.'
                : 'For regional distributors, dealers and professional business partners.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Log In
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            Register
          </button>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {tab === 'login' ? (
          <form className="form-card" onSubmit={doLogin}>
            <h3>{isVIP ? 'Member Login' : 'Trade Partner Login'}</h3>
            <div className="field">
              <label>Email Address</label>
              <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Logging in…' : 'Log In'}
            </button>
            <div className="mt-1 small">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <div className="auth-sep">— or —</div>
            <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={() => setTab('register')}>
              Create an account
            </button>
          </form>
        ) : (
          <div className="form-card">
            <h3>{isVIP ? 'Aurius Trade Professional Registration' : 'Aurius Trade Partner Registration'}</h3>
            <p className="muted small">{isVIP ? 'For licensed Australian plumbers and electricians only.' : 'Register your business for trade access.'}</p>
            {isVIP && <p className="small">Dealers, installers and other business partners: <Link to="/trade?tab=register">apply through our Trade Partner Portal</Link>.</p>}

            <div className="step-indicator">
              <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
              <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
              <div className={`step-dot ${step >= 3 ? 'active' : ''}`} />
            </div>

            {step === 1 && (
              <>
                {!isVIP && <>
                  <div className="field">
                    <label htmlFor="partnership-type">Partnership Type <span className="req">*</span></label>
                    <select id="partnership-type" value={reg.partnershipType} onChange={set('partnershipType')}>
                      <option value="REGIONAL_DISTRIBUTOR">Regional Distributor (Level 1)</option>
                      <option value="DEALER">Dealer / Reseller</option>
                      <option value="TRADE_PROFESSIONAL">Installer / Other Trade Professional</option>
                    </select>
                  </div>
                  {isRegional && <div className="field">
                    <label htmlFor="intended-territory">Intended Distribution Territory <span className="req">*</span></label>
                    <input id="intended-territory" type="text" maxLength={200} placeholder="e.g. Greater Sydney, NSW" value={reg.intendedTerritory} onChange={set('intendedTerritory')} />
                    <div className="hint">Tell us the region you would like to represent. Territory allocation is subject to approval.</div>
                    {fieldErr('intendedTerritory')}
                  </div>}
                </>}
                {isVIP && (
                  <div className="field">
                    <label>
                      Trade Type <span className="req">*</span>
                    </label>
                    <select value={reg.tradeType} onChange={set('tradeType')}>
                      <option value="">Select…</option>
                      <option value="LICENSED_PLUMPER">Licensed Plumber</option>
                      <option value="LICENSED_ELECTRICIAN">Licensed Electrician</option>
                    </select>
                    {fieldErr('tradeType')}
                  </div>
                )}
                <div className="field">
                  <label>
                    Australian State / Territory <span className="req">*</span>
                  </label>
                  <select value={reg.state} onChange={set('state')}>
                    <option value="">Select…</option>
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {fieldErr('state')}
                </div>
                <div className="field">
                  <label>Licence Type</label>
                  <select value={reg.licenceType} onChange={set('licenceType')}>
                    <option value="">Select…</option>
                    <option value="INDIVIDUAL">Individual Licence</option>
                    <option value="COMPANY">Company Licence</option>
                  </select>
                  {fieldErr('licenceType')}
                </div>
                <div className="field">
                  <label>{isVIP ? 'Licence Number' : 'Licence Number (optional)'}</label>
                  <input type="text" placeholder={isVIP ? 'e.g. PLB-12345 or EC-67890' : 'e.g. PLB-12345'} value={reg.licenceNumber} onChange={set('licenceNumber')} />
                  {fieldErr('licenceNumber')}
                </div>
                <button className="btn btn-primary" onClick={next}>
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="form-grid-2">
                  <div className="field">
                    <label>
                      First Name <span className="req">*</span>
                    </label>
                    <input type="text" value={reg.firstName} onChange={set('firstName')} />
                    {fieldErr('firstName')}
                  </div>
                  <div className="field">
                    <label>
                      Last Name <span className="req">*</span>
                    </label>
                    <input type="text" value={reg.lastName} onChange={set('lastName')} />
                    {fieldErr('lastName')}
                  </div>
                </div>
                <div className="field">
                  <label>
                    Company Name <span className="req">*</span>
                  </label>
                  <input type="text" value={reg.companyName} onChange={set('companyName')} />
                  <div className="hint">If self-employed, enter your full name</div>
                  {fieldErr('companyName')}
                </div>
                <div className="field">
                  <label>
                    Street Address <span className="req">*</span>
                  </label>
                  <input type="text" value={reg.streetAddress} onChange={set('streetAddress')} />
                  {fieldErr('streetAddress')}
                </div>
                <div className="form-grid-2">
                  <div className="field">
                    <label>
                      Suburb <span className="req">*</span>
                    </label>
                    <input type="text" value={reg.suburb} onChange={set('suburb')} />
                    {fieldErr('suburb')}
                  </div>
                  <div className="field">
                    <label>
                      Postcode <span className="req">*</span>
                    </label>
                    <input type="text" value={reg.postcode} onChange={set('postcode')} />
                    {fieldErr('postcode')}
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="field">
                    <label>Country</label>
                    <select value={reg.country} onChange={set('country')}>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>
                      Phone Number <span className="req">*</span>
                    </label>
                    <input type="tel" value={reg.phone} onChange={set('phone')} />
                    {fieldErr('phone')}
                  </div>
                </div>
                <div className="field">
                  <label>Website / Social Media (optional)</label>
                  <input type="text" value={reg.website} onChange={set('website')} />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button className="btn btn-primary" onClick={next}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="form-grid-2">
                  <div className="field">
                    <label>Email Address</label>
                    <input type="email" value={reg.email} onChange={set('email')} />
                    {fieldErr('email')}
                  </div>
                  <div className="field">
                    <label>Years of Experience</label>
                    <select value={reg.yearsExperience} onChange={set('yearsExperience')}>
                      <option value="">Select…</option>
                      {YEARS.map((y) => (
                        <option key={y.value} value={y.value}>
                          {y.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {isVIP && (
                  <div className="form-grid-2">
                    <div className="field">
                      <label>Smart Toilet Installation Experience</label>
                      <select value={reg.smartToiletExp} onChange={set('smartToiletExp')}>
                        <option value="">Select…</option>
                        {EXP_LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                      {fieldErr('smartToiletExp')}
                    </div>
                    <div className="field">
                      <label>Whole-House Water Purification Installation Experience</label>
                      <select value={reg.waterPurifExp} onChange={set('waterPurifExp')}>
                        <option value="">Select…</option>
                        {EXP_LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                      {fieldErr('waterPurifExp')}
                    </div>
                  </div>
                )}
                <div className="form-grid-2">
                  <div className="field">
                    <label>Password</label>
                    <input type="password" value={reg.password} onChange={set('password')} />
                    <div className="hint">Min 8 characters: uppercase, lowercase, number &amp; special character</div>
                    {fieldErr('password')}
                  </div>
                  <div className="field">
                    <label>Confirm Password</label>
                    <input type="password" value={reg.confirmPassword} onChange={set('confirmPassword')} />
                    {fieldErr('confirmPassword')}
                  </div>
                </div>
                <div className="field">
                  <label>ABN Number ({isVIP ? 'optional' : 'recommended'})</label>
                  <input type="text" placeholder="11-digit ABN" value={reg.abnNumber} onChange={set('abnNumber')} />
                  {fieldErr('abnNumber')}
                </div>
                <div className="field">
                  <label>
                    Business Interest / Main Categories <span className="req">*</span>
                  </label>
                  <div className="flex gap-1 wrap">
                    {['Smart Toilet', 'Whole-House Water Purification', 'All Categories'].map((v) => (
                      <label key={v} className="checkbox-row">
                        <input type="checkbox" checked={reg.businessInterest.includes(v)} onChange={() => toggleInterest(v)} />
                        {v}
                      </label>
                    ))}
                  </div>
                  {fieldErr('businessInterest')}
                </div>
                <div className="field">
                  <label>Additional Notes (optional)</label>
                  <textarea
                    placeholder="Specialty areas, project references, existing brands, expected annual purchase, regional resources"
                    value={reg.additionalNotes}
                    onChange={set('additionalNotes')}
                  />
                </div>
                {isVIP && (
                  <div className="field">
                    <label>Licence Document (JPG/PNG/PDF, max 5MB)</label>
                    <div className="upload-box">
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setLicenceFile(e.target.files?.[0] ?? null)} />
                      {licenceFile && <p className="small mt-1">{licenceFile.name}</p>}
                    </div>
                  </div>
                )}
                <div className="field">
                  <label className="checkbox-row">
                    <input type="checkbox" checked={reg.privacyConsent} onChange={(e) => setReg({ ...reg, privacyConsent: e.target.checked })} />
                    <span>
                      I have read and agree to the <Link to="/privacy-policy">Privacy Policy</Link> and{' '}
                      <Link to="/terms">Terms of Service</Link>.
                    </span>
                  </label>
                  {fieldErr('privacyConsent')}
                </div>
                <div className="field">
                  <label className="checkbox-row">
                    <input type="checkbox" checked={reg.dealerAgreement} onChange={(e) => setReg({ ...reg, dealerAgreement: e.target.checked })} />
                    <span>
                      I agree to the <Link to="/dealer-agreement">Dealer / Trade Agreement</Link>.
                    </span>
                  </label>
                  {fieldErr('dealerAgreement')}
                </div>
                <div className="field">
                  <label className="checkbox-row">
                    <input type="checkbox" checked={reg.marketingConsent} onChange={(e) => setReg({ ...reg, marketingConsent: e.target.checked })} />
                    <span>I agree to receive product updates, installation guides and trade offers from Aurius.</span>
                  </label>
                </div>
                {siteKey && (
                  <div className="field">
                    <div className="g-recaptcha" data-sitekey={siteKey} />
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button className="btn btn-primary btn-lg" onClick={submitReg} disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

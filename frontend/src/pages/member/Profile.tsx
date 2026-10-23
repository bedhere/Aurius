import { useI18n } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { AU_STATES } from '../../api/types';
import { roleLabel, roleShort, statusBadgeClass } from '../../utils/format';
import '../../assets/styles/pages-member.css';

interface ProfileRow {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string | null;
  website: string | null;
  socialMedia: string | null;
  streetAddress: string;
  suburb: string;
  state: string | null;
  postcode: string;
  country: string;
}

interface LicenceRow {
  tradeType: string;
  licenceType: string | null;
  licenceNumber: string;
  state: string | null;
  fileOriginalName: string | null;
  verificationStatus: string;
}

export default function Profile() {
  const { t } = useI18n();
  const { me, user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [licence, setLicence] = useState<LicenceRow | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<ProfileRow>('/api/profile').then(setProfile).catch(() => setProfile(null));
    api.get<LicenceRow>('/api/applications/me/licence').then(setLicence).catch(() => setLicence(null));
  }, []);

  if (!profile) return <Spinner />;

  const set = (k: keyof ProfileRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProfile({ ...profile, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api/profile', profile);
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2>{t("My Profile")}</h2>
      {message && <Alert type={message.type}>{t(message.text)}</Alert>}

      <div className="panel">
        <h3>{t("Account & Membership")}</h3>
        <div className="kv-grid">
          <div>
            <div className="kv-label">{t("Member ID")}</div>
            <div className="kv-value">{me?.memberId?.aurId ?? '—'}</div>
          </div>
          <div>
            <div className="kv-label">{t("Role")}</div>
            <div className="kv-value">{user ? t(roleLabel(user.role)) : '—'}</div>
          </div>
          <div>
            <div className="kv-label">{t("Price Level")}</div>
            <div className="kv-value">{user ? t(roleShort(user.role)) : '—'}</div>
          </div>
          <div>
            <div className="kv-label">{t("Account Status")}</div>
            <div className="kv-value">
              <span className={`badge ${statusBadgeClass(me?.accountStatus ?? '')}`}>{t(me?.accountStatus ?? '')}</span>
            </div>
          </div>
          {licence && (
            <>
              <div>
                <div className="kv-label">{t("Licence Number")}</div>
                <div className="kv-value">{licence.licenceNumber || '—'}</div>
              </div>
              <div>
                <div className="kv-label">{t("Licence Status")}</div>
                <div className="kv-value">
                  <span className={`badge ${statusBadgeClass(licence.verificationStatus)}`}>{t(licence.verificationStatus)}</span>
                </div>
              </div>
            </>
          )}
        </div>
        <p className="small muted mt-2">
          {t("Member ID, role, price level and licence details cannot be edited here. Licence changes require re-verification by our team.")}
        </p>
      </div>

      <form className="panel" onSubmit={save}>
        <h3>{t("Contact Details")}</h3>
        <div className="form-grid-2">
          <div className="field">
            <label>{t("First Name")}</label>
            <input type="text" value={profile.firstName} onChange={set('firstName')} />
          </div>
          <div className="field">
            <label>{t("Last Name")}</label>
            <input type="text" value={profile.lastName} onChange={set('lastName')} />
          </div>
          <div className="field">
            <label>{t("Company Name")}</label>
            <input type="text" value={profile.companyName} onChange={set('companyName')} />
          </div>
          <div className="field">
            <label>{t("Phone")}</label>
            <input type="tel" value={profile.phone ?? ''} onChange={set('phone')} />
          </div>
          <div className="field">
            <label>{t("Website")}</label>
            <input type="text" value={profile.website ?? ''} onChange={set('website')} />
          </div>
          <div className="field">
            <label>{t("Social Media")}</label>
            <input type="text" value={profile.socialMedia ?? ''} onChange={set('socialMedia')} />
          </div>
        </div>
        <h3>{t("Business Address")}</h3>
        <div className="field">
          <label>{t("Street")}</label>
          <input type="text" value={profile.streetAddress} onChange={set('streetAddress')} />
        </div>
        <div className="form-grid-2">
          <div className="field">
            <label>{t("Suburb")}</label>
            <input type="text" value={profile.suburb} onChange={set('suburb')} />
          </div>
          <div className="field">
            <label>{t("State")}</label>
            <select value={profile.state ?? ''} onChange={set('state')}>
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
            <input type="text" value={profile.postcode} onChange={set('postcode')} />
          </div>
          <div className="field">
            <label>{t("Country")}</label>
            <input type="text" value={profile.country} onChange={set('country')} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? t("Saving…") : t("Save Changes")}
        </button>
      </form>
    </>
  );
}

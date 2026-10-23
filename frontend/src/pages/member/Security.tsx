import { useI18n } from '../../i18n/LanguageContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import '../../assets/styles/pages-member.css';

export default function Security() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password updated.' });
      setCurrent('');
      setNew('');
      setConfirm('');
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <h2>{t("Security")}</h2>
      {message && <Alert type={message.type}>{t(message.text)}</Alert>}

      <form className="panel" onSubmit={change}>
        <h3>{t("Change Password")}</h3>
        <div className="field">
          <label>{t("Current Password")}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="form-grid-2">
          <div className="field">
            <label>{t("New Password")}</label>
            <input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t("Confirm New Password")}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
        </div>
        <div className="hint mb-2">
          {t("Password must be at least 8 characters and include uppercase, lowercase, a number and a special character.")}
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? t("Saving…") : t("Update Password")}
        </button>
      </form>

      <div className="panel">
        <h3>{t("Account Security")}</h3>
        <ul>
          <li>{t("Sensitive data (ABN, licence numbers, phone) is encrypted at rest with AES-256.")}</li>
          <li>{t("Passwords are stored as one-way cryptographic hashes.")}</li>
          <li>{t("Your session expires automatically for your protection.")}</li>
        </ul>
        <button className="btn btn-danger" onClick={doLogout}>
          {t("Log Out")}
        </button>
      </div>
    </>
  );
}

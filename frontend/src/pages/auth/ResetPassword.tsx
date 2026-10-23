import { useI18n } from '../../i18n/LanguageContext';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import '../../assets/styles/pages-auth.css';

export default function ResetPassword() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      setBusy(false);
      return;
    }
    try {
      await api.post('/api/auth/reset-password', { token, password, confirmPassword: confirm });
      setDone(true);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="auth-wrap">
        <h2 className="section-title">{t("Set a New Password")}</h2>
        {done ? (
          <div className="form-card">
            <Alert type="success">{t("Password has been reset. You can now log in.")}</Alert>
            <Link to="/plumbers-builders" className="btn btn-primary">
              {t("Log in")}
            </Link>
          </div>
        ) : (
          <form className="form-card" onSubmit={submit}>
            {error && <Alert type="error">{error}</Alert>}
            <div className="field">
              <label>{t("New Password")}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <div className="hint">{t("Min 8 characters: uppercase, lowercase, number & special character")}</div>
            </div>
            <div className="field">
              <label>{t("Confirm Password")}</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? t("Saving…") : t("Reset Password")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

import { useI18n } from '../../i18n/LanguageContext';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import '../../assets/styles/pages-auth.css';

export default function AdminLogin() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await login(email, password);
      if (me?.role === 'ADMIN') navigate('/admin');
      else setError('Admin permission required');
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="auth-wrap">
        <div className="center mb-2">
          <h2 className="section-title">{t("AURIUS Admin Console")}</h2>
        </div>
        <form className="form-card" onSubmit={submit}>
          {error && <Alert type="error">{error}</Alert>}
          <div className="field">
            <label>{t("Email Address")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t("Password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? t("Logging in…") : t("Log In")}
          </button>
          <div className="mt-2 small">
            <Link to="/">{t("← Back to website")}</Link>
          </div>
        </form>
      </div>
    </section>
  );
}

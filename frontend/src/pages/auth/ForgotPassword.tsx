import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import '../../assets/styles/pages-auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/auth/forgot-password', { email });
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
        <h2 className="section-title">Reset Password</h2>
        {done ? (
          <div className="form-card">
            <Alert type="success">If the email exists, a reset link has been sent.</Alert>
            <Link to="/vip" className="btn btn-outline">
              Back to login
            </Link>
          </div>
        ) : (
          <form className="form-card" onSubmit={submit}>
            {error && <Alert type="error">{error}</Alert>}
            <p className="muted small">Enter your email address and we will send you a password reset link.</p>
            <div className="field">
              <label>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
            <div className="mt-2 small">
              <Link to="/vip">← Back to login</Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

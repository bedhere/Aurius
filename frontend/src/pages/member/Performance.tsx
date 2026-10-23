import { useI18n } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, fmtDateTime, fmtMoney, statusBadgeClass } from '../../utils/format';
import '../../assets/styles/pages-member.css';

interface Performance {
  totalOrders: number;
  totalSales: number;
  monthSales: number;
  yearSales: number;
  totalInstalledUnits: number;
  adjustments: { id: number; adjustedAt: string; type: string; adjustedAmount: number; reason: string | null }[];
  aurId: string | null;
}

interface Referral {
  id: number;
  orderNumber: string;
  orderAmount: number;
  status: string;
  creditedAt: string | null;
  orderDate: string;
}

export default function Performance() {
  const { t } = useI18n();
  const { me } = useAuth();
  const [perf, setPerf] = useState<Performance | null>(null);
  const [refs, setRefs] = useState<Referral[]>([]);
  const [installs, setInstalls] = useState<{
    id: number;
    productName: string;
    serialNumber: string | null;
    installationDate: string | null;
    installationAddress: string | null;
    contactEmail: string | null;
    status: string;
  }[]>([]);
  const [form, setForm] = useState({ productName: '', serialNumber: '', installationDate: '', installationAddress: '', contactEmail: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isWaterworker = me?.role === 'WATERWORKER';

  const load = () => {
    api.get<Performance>('/api/performance').then(setPerf).catch(() => setPerf(null));
    api.get<Referral[]>('/api/referrals').then(setRefs).catch(() => setRefs([]));
    if (isWaterworker) {
      api.get('/api/installations').then(setInstalls).catch(() => setInstalls([]));
    } else {
      setInstalls([]);
    }
  };

  useEffect(load, [isWaterworker]);

  const submitInstallation = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/api/installations', {
        technicianAurId: me?.memberId?.aurId ?? null,
        productId: null,
        productName: form.productName,
        serialNumber: form.serialNumber || null,
        installationDate: form.installationDate ? new Date(form.installationDate).toISOString() : null,
        installationAddress: form.installationAddress || null,
        contactEmail: form.contactEmail || null,
      });
      setMessage({ type: 'success', text: 'Installation registered.' });
      setForm({ productName: '', serialNumber: '', installationDate: '', installationAddress: '', contactEmail: '' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  return (
    <>
      <h2>{t("My Performance")}</h2>
      {message && <Alert type={message.type}>{t(message.text)}</Alert>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{t("Total Orders")}</div>
          <div className="stat-value">{perf?.totalOrders ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("Total Sales")}</div>
          <div className="stat-value">{fmtMoney(perf?.totalSales ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("This Month")}</div>
          <div className="stat-value">{fmtMoney(perf?.monthSales ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("This Year")}</div>
          <div className="stat-value">{fmtMoney(perf?.yearSales ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("Installed Units")}</div>
          <div className="stat-value">{perf?.totalInstalledUnits ?? 0}</div>
        </div>
      </div>

      <div className="panel">
        <h3>{t("Performance Adjustments")}</h3>
        {!perf || perf.adjustments.length === 0 ? (
          <p className="muted small">{t("No adjustments.")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("Date")}</th>
                  <th>{t("Type")}</th>
                  <th>{t("Amount")}</th>
                  <th>{t("Reason")}</th>
                </tr>
              </thead>
              <tbody>
                {perf.adjustments.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDateTime(a.adjustedAt)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(a.type)}`}>{t(a.type)}</span>
                    </td>
                    <td>{fmtMoney(a.adjustedAmount)}</td>
                    <td>{a.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>{t("My Referrals")}</h3>
        {refs.length === 0 ? (
          <p className="muted small">{t("No referral sales yet.")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("Order")}</th>
                  <th>{t("Date")}</th>
                  <th>{t("Amount")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.orderNumber}</td>
                    <td>{fmtDate(r.orderDate)}</td>
                    <td>{fmtMoney(r.orderAmount)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(r.status)}`}>{t(r.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isWaterworker && (
        <>
          <form className="panel" onSubmit={submitInstallation}>
            <h3>{t("Register an Installation")}</h3>
            <div className="form-grid-2">
              <div className="field">
                <label>{t("Product Name")}</label>
                <input type="text" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
              </div>
              <div className="field">
                <label>{t("Serial Number")}</label>
                <input type="text" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div className="field">
                <label>{t("Installation Date")}</label>
                <input type="date" value={form.installationDate} onChange={(e) => setForm({ ...form, installationDate: e.target.value })} />
              </div>
              <div className="field">
                <label>{t("Installation Address")}</label>
                <input type="text" value={form.installationAddress} onChange={(e) => setForm({ ...form, installationAddress: e.target.value })} />
              </div>
              <div className="field">
                <label>{t("Customer Email (optional)")}</label>
                <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              {t("Register Installation")}
            </button>
          </form>

          {installs.length > 0 && (
            <div className="panel">
              <h3>{t("My Installations")}</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("Product")}</th>
                      <th>{t("Serial")}</th>
                      <th>{t("Date")}</th>
                      <th>{t("Installation Address")}</th>
                      <th>{t("Customer Email (optional)")}</th>
                      <th>{t("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installs.map((i) => (
                      <tr key={i.id}>
                        <td>{i.productName}</td>
                        <td>{i.serialNumber ?? '—'}</td>
                        <td>{fmtDate(i.installationDate)}</td>
                        <td>{i.installationAddress ?? '—'}</td>
                        <td>{i.contactEmail ?? '—'}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(i.status)}`}>{t(i.status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

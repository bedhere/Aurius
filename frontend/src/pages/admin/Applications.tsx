import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { fmtDateTime, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface AppRow {
  id: number;
  applicationNo: string;
  status: string;
  channel: string;
  partnershipType: string | null;
  intendedTerritory: string | null;
  tradeType: string;
  state: string | null;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  abnNumber: string;
  abnStatus: string;
  licenceNumber: string;
  submittedAt: string;
}

interface AppDetail {
  id: number;
  applicationNo: string;
  status: string;
  channel: string;
  partnershipType: string | null;
  intendedTerritory: string | null;
  tradeType: string;
  state: string | null;
  licenceType: string | null;
  licenceNumber: string;
  firstName: string;
  lastName: string;
  companyName: string;
  streetAddress: string;
  suburb: string;
  postcode: string;
  country: string;
  phone: string;
  website: string | null;
  abnNumber: string;
  abnStatus: string;
  yearsExperience: number | null;
  smartToiletExp: string | null;
  waterPurifExp: string | null;
  additionalNotes: string | null;
  businessInterest: string | null;
  privacyConsent: boolean;
  dealerAgreement: boolean;
  marketingConsent: boolean;
  email: string;
  accountStatus: string;
  licences: { id: number; licenceType: string | null; licenceNumber: string; fileUrl: string | null; fileOriginalName: string | null; verificationStatus: string }[];
  reviewLogs: { reviewTime: string; previousStatus: string; newStatus: string; reviewNotes: string | null; action: string }[];
}

function partnershipLabel(type: string | null) {
  return ({ REGIONAL_DISTRIBUTOR: 'Regional Distributor', DEALER: 'Dealer / Reseller', TRADE_PROFESSIONAL: 'Trade Professional' } as Record<string, string>)[type ?? ''] ?? '—';
}

export default function Applications() {
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [partnershipType, setPartnershipType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AppRow[]; total: number; page: number; pageSize: number } | null>(null);
  const [selected, setSelected] = useState<AppDetail | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadList = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    if (channel) params.set('channel', channel);
    if (partnershipType) params.set('partnershipType', partnershipType);
    if (search) params.set('search', search);
    api.get(`/api/admin/applications?${params.toString()}`).then(setData).catch(() => setData(null));
  };

  useEffect(loadList, [status, channel, partnershipType, search, page]);

  const loadDetail = (id: number) => {
    setSelected(null);
    api.get<AppDetail>(`/api/admin/applications/${id}`).then(setSelected).catch(() => setSelected(null));
  };

  const review = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return;
    let body: Record<string, unknown> = { action, ...extra };
    if (action === 'REJECT') {
      const reason = window.prompt('Reject reason');
      if (!reason) return;
      body = { action, reason };
    } else if (action === 'REQUEST_MORE_INFO') {
      const info = window.prompt('What information is needed?');
      if (!info) return;
      body = { action, requestedInfo: info };
    } else if (action === 'APPROVE') {
      const role = window.prompt('Approve role (REGIONAL_AGENT / LICENSED_TRADESMAN / SUB_DEALER / WATERWORKER / BUILDER)', selected.partnershipType === 'REGIONAL_DISTRIBUTOR' ? 'REGIONAL_AGENT' : selected.tradeType === 'BUILDER' ? 'BUILDER' : selected.channel === 'VIP' ? 'LICENSED_TRADESMAN' : 'SUB_DEALER');
      if (!role) return;
      body = { action, role };
    }
    try {
      await api.post(`/api/admin/applications/${selected.id}/review`, body);
      setMessage({ type: 'success', text: 'Review action completed.' });
      loadDetail(selected.id);
      loadList();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const abnCheck = async (action: 'VERIFY_ABR' | 'VERIFY_MANUAL' | 'REJECT_ABN') => {
    if (!selected) return;
    const note = action === 'VERIFY_ABR' ? undefined : window.prompt('Note') ?? undefined;
    try {
      const r = await api.post<{ message?: string }>(`/api/admin/applications/${selected.id}/abn-check`, { action, note });
      setMessage({ type: 'success', text: r.message ?? 'ABN action completed.' });
      loadDetail(selected.id);
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  return (
    <>
      <h2>{tAdmin('applications')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="admin-filters">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'MORE_INFO_REQUIRED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
          <option value="">All channels</option>
          <option value="VIP">Plumbers &amp; Builders</option>
          <option value="TRADE">TRADE</option>
        </select>
        <select aria-label="Partnership type filter" value={partnershipType} onChange={(e) => { setPartnershipType(e.target.value); setPage(1); }}>
          <option value="">All partnership types</option>
          <option value="REGIONAL_DISTRIBUTOR">Regional Distributor</option>
          <option value="DEALER">Dealer / Reseller</option>
          <option value="TRADE_PROFESSIONAL">Trade Professional</option>
        </select>
        <input
          type="text"
          placeholder="Search…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setSearch((e.target as HTMLInputElement).value.trim()); setPage(1); }
          }}
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Channel</th>
              <th>Partnership</th>
              <th>Intended Territory</th>
              <th>State</th>
              <th>ABN</th>
              <th>Status</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((a) => (
              <tr key={a.id} onClick={() => loadDetail(a.id)} style={{ cursor: 'pointer' }}>
                <td className="small">{a.applicationNo}</td>
                <td>{a.firstName} {a.lastName}</td>
                <td>{a.companyName}</td>
                <td className="small">{a.email}</td>
                <td>{a.channel}</td>
                <td>{partnershipLabel(a.partnershipType)}</td>
                <td>{a.intendedTerritory ?? '—'}</td>
                <td>{a.state ?? '—'}</td>
                <td>
                  <span className={`badge ${statusBadgeClass(a.abnStatus)}`}>{a.abnStatus}</span>
                </td>
                <td>
                  <span className={`badge ${statusBadgeClass(a.status)}`}>{a.status}</span>
                </td>
                <td className="small">{fmtDateTime(a.submittedAt)}</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); loadDetail(a.id); }}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}

      {selected && (
        <div className="panel mt-2">
          <h3>Application Detail — {selected.applicationNo}</h3>
          <div className="detail-grid">
            <div>
              <div className="kv"><b>Contact</b><span>{selected.firstName} {selected.lastName}</span></div>
              <div className="kv"><b>Company</b><span>{selected.companyName}</span></div>
              <div className="kv"><b>Email</b><span>{selected.email}</span></div>
              <div className="kv"><b>Phone</b><span>{selected.phone}</span></div>
              <div className="kv"><b>Country</b><span>{selected.country}</span></div>
              <div className="kv"><b>State</b><span>{selected.state ?? '—'}</span></div>
              <div className="kv"><b>Address</b><span>{selected.streetAddress}, {selected.suburb} {selected.postcode}</span></div>
              <div className="kv"><b>Website</b><span>{selected.website ?? '—'}</span></div>
            </div>
            <div>
              <div className="kv"><b>Channel</b><span>{selected.channel}</span></div>
              <div className="kv"><b>Partnership</b><span>{partnershipLabel(selected.partnershipType)}</span></div>
              <div className="kv"><b>Intended Territory</b><span>{selected.intendedTerritory ?? '—'}</span></div>
              <div className="kv"><b>Trade Type</b><span>{selected.tradeType}</span></div>
              <div className="kv"><b>Licence Type</b><span>{selected.licenceType ?? '—'}</span></div>
              <div className="kv"><b>Licence Number</b><span>{selected.licenceNumber || '—'}</span></div>
              <div className="kv"><b>ABN</b><span>{selected.abnNumber || '—'}</span></div>
              <div className="kv"><b>ABN Status</b><span className={`badge ${statusBadgeClass(selected.abnStatus)}`}>{selected.abnStatus}</span></div>
              <div className="kv"><b>Experience</b><span>{selected.yearsExperience ? `${selected.yearsExperience} years` : '—'}</span></div>
              <div className="kv"><b>Smart Toilet Exp</b><span>{selected.smartToiletExp ?? '—'}</span></div>
              <div className="kv"><b>Water Purif Exp</b><span>{selected.waterPurifExp ?? '—'}</span></div>
              <div className="kv"><b>Business Interest</b><span>{selected.businessInterest ?? '—'}</span></div>
            </div>
          </div>

          {selected.additionalNotes && (
            <div className="mt-2">
              <b>Additional Notes:</b> <p className="small">{selected.additionalNotes}</p>
            </div>
          )}
          <p className="small muted">
            Privacy consent: {selected.privacyConsent ? 'Yes' : 'No'} · Dealer agreement:{' '}
            {selected.dealerAgreement ? 'Yes' : 'No'} · Marketing consent: {selected.marketingConsent ? 'Yes' : 'No'}
          </p>

          {selected.licences.length > 0 && (
            <div className="mt-2">
              <b>Licence Files</b>
              <table className="mini-table">
                <thead>
                  <tr><th>Type</th><th>Number</th><th>Status</th><th>File</th></tr>
                </thead>
                <tbody>
                  {selected.licences.map((l) => (
                    <tr key={l.id}>
                      <td>{l.licenceType ?? '—'}</td>
                      <td>{l.licenceNumber || '—'}</td>
                      <td><span className={`badge ${statusBadgeClass(l.verificationStatus)}`}>{l.verificationStatus}</span></td>
                      <td className="file-preview">
                        {l.fileUrl ? <a href={l.fileUrl} target="_blank" rel="noreferrer">{l.fileOriginalName ?? 'View'}</a> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="action-bar">
            <button className="btn btn-primary btn-sm" onClick={() => review('APPROVE')} disabled={selected.status === 'APPROVED'}>
              {tAdmin('approve')}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => review('REJECT')} disabled={selected.status === 'APPROVED'}>
              {tAdmin('reject')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => review('REQUEST_MORE_INFO')} disabled={selected.status === 'APPROVED'}>
              {tAdmin('requestInfo')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => review('FREEZE')}>{tAdmin('freeze')}</button>
          </div>
          <div className="action-bar">
            <button className="btn btn-ghost btn-sm" onClick={() => abnCheck('VERIFY_ABR')}>ABR Verify</button>
            <button className="btn btn-ghost btn-sm" onClick={() => abnCheck('VERIFY_MANUAL')}>Manual Verify ABN</button>
            <button className="btn btn-ghost btn-sm" onClick={() => abnCheck('REJECT_ABN')}>Reject ABN</button>
          </div>

          <b>Review History</b>
          <table className="mini-table mt-1">
            <thead>
              <tr><th>Time</th><th>From</th><th>To</th><th>Action</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {selected.reviewLogs.map((l, i) => (
                <tr key={i}>
                  <td className="small">{fmtDateTime(l.reviewTime)}</td>
                  <td>{l.previousStatus}</td>
                  <td>{l.newStatus}</td>
                  <td>{l.action}</td>
                  <td className="small">{l.reviewNotes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-ghost btn-sm mt-2" onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </>
  );
}

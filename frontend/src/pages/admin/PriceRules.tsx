import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { AU_STATES } from '../../api/types';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface Rule {
  id: number;
  name: string;
  type: string;
  country: string | null;
  state: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  percentValue: number;
  active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  REGIONAL_DISCOUNT: 'Regional Discount',
  VOLUME_DISCOUNT: 'Volume Discount',
  REMOTE_AREA_SURCHARGE: 'Remote Area Surcharge',
};

const empty = { name: '', type: 'VOLUME_DISCOUNT', state: '', minQuantity: '', maxQuantity: '', percentValue: 0 };

export default function PriceRules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => api.get<Rule[]>('/api/admin/price-rules').then(setRules).catch(() => setRules([]));
  useEffect(() => { void load(); }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [k]: v });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const payload = {
      name: form.name,
      type: form.type,
      state: form.state || null,
      minQuantity: form.minQuantity === '' ? null : Number(form.minQuantity),
      maxQuantity: form.maxQuantity === '' ? null : Number(form.maxQuantity),
      percentValue: Number(form.percentValue),
      active: true,
    };
    try {
      if (editingId) await api.put(`/api/admin/price-rules/${editingId}`, payload);
      else await api.post('/api/admin/price-rules', payload);
      setMessage({ type: 'success', text: 'Rule saved.' });
      setForm(empty);
      setEditingId(null);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const deactivate = async (id: number) => {
    await api.delete(`/api/admin/price-rules/${id}`);
    load();
  };

  return (
    <>
      <h2>{tAdmin('prices')}</h2>
      <p className="small muted">基础三级价格在商品管理中维护；此处为区域/阶梯扩展规则（折扣为负数，附加费为正数）。</p>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <form className="panel" onSubmit={submit}>
        <h3>{editingId ? 'Edit Rule' : 'New Price Rule'}</h3>
        <div className="form-grid-2">
          <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label>Type</label><select value={form.type} onChange={set('type')}>
            <option value="REGIONAL_DISCOUNT">Regional Discount</option>
            <option value="VOLUME_DISCOUNT">Volume Discount</option>
            <option value="REMOTE_AREA_SURCHARGE">Remote Area Surcharge</option>
          </select></div>
          <div className="field"><label>State (optional)</label><select value={form.state} onChange={set('state')}>
            <option value="">All</option>
            {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
          <div className="field"><label>Percent Value (%)</label><input type="number" step="0.1" value={form.percentValue} onChange={set('percentValue')} required /></div>
          <div className="field"><label>Min Quantity (optional)</label><input type="number" value={form.minQuantity} onChange={set('minQuantity')} /></div>
          <div className="field"><label>Max Quantity (optional)</label><input type="number" value={form.maxQuantity} onChange={set('maxQuantity')} /></div>
        </div>
        <button className="btn btn-primary" type="submit">Save Rule</button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>State</th><th>Qty Range</th><th>%</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{TYPE_LABELS[r.type] ?? r.type}</td>
                <td>{r.state ?? 'All'}</td>
                <td>{r.minQuantity ?? '—'} – {r.maxQuantity ?? '—'}</td>
                <td>{r.percentValue > 0 ? '+' : ''}{r.percentValue}%</td>
                <td>{r.active ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => { setEditingId(r.id); setForm({ name: r.name, type: r.type, state: r.state ?? '', minQuantity: r.minQuantity === null ? '' : String(r.minQuantity), maxQuantity: r.maxQuantity === null ? '' : String(r.maxQuantity), percentValue: r.percentValue }); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deactivate(r.id)}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

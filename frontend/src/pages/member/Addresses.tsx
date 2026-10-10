import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Spinner } from '../../components/ui';
import { AU_STATES } from '../../api/types';
import '../../assets/styles/pages-member.css';

interface Address {
  id: number;
  label: string;
  contactName: string;
  phone: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  isDefault: boolean;
}

const empty = { label: '', contactName: '', phone: '', street: '', suburb: '', state: '', postcode: '', country: 'Australia' };

export default function Addresses() {
  const [list, setList] = useState<Address[] | null>(null);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => api.get<Address[]>('/api/addresses').then(setList).catch(() => setList([]));

  useEffect(() => {
    load();
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post('/api/addresses', form);
      setForm(empty);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Remove this address?')) return;
    await api.delete(`/api/addresses/${id}`);
    load();
  };

  return (
    <>
      <h2>Shipping Addresses</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      {list === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="muted">No saved addresses.</p>
      ) : (
        <div className="card-grid" style={{ marginBottom: 24 }}>
          {list.map((a) => (
            <div className="card" key={a.id}>
              <div className="card__body">
                <div className="flex items-center gap-1">
                  <h3 className="card__title" style={{ margin: 0 }}>
                    {a.label}
                  </h3>
                  {a.isDefault && <span className="badge badge-teal">Default</span>}
                </div>
                <p className="small" style={{ margin: 0 }}>
                  {a.contactName}
                  <br />
                  {a.street}, {a.suburb}, {a.state} {a.postcode}
                  <br />
                  {a.country} · {a.phone}
                </p>
                <div>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form className="panel" onSubmit={add}>
        <h3>Add Address</h3>
        <div className="form-grid-2">
          <div className="field">
            <label>Label</label>
            <input type="text" placeholder="e.g. Warehouse" value={form.label} onChange={set('label')} />
          </div>
          <div className="field">
            <label>Contact Name</label>
            <input type="text" value={form.contactName} onChange={set('contactName')} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')} required />
          </div>
          <div className="field">
            <label>Street</label>
            <input type="text" value={form.street} onChange={set('street')} required />
          </div>
          <div className="field">
            <label>Suburb</label>
            <input type="text" value={form.suburb} onChange={set('suburb')} required />
          </div>
          <div className="field">
            <label>State</label>
            <select value={form.state} onChange={set('state')} required>
              <option value="">Select…</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Postcode</label>
            <input type="text" value={form.postcode} onChange={set('postcode')} required />
          </div>
          <div className="field">
            <label>Country</label>
            <input type="text" value={form.country} onChange={set('country')} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">
          Save Address
        </button>
      </form>
    </>
  );
}

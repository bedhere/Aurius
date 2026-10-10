import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { DealerLocation, AU_STATES } from '../../api/types';
import { Alert } from '../../components/ui';
import { statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

type DealerForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  photos: string;
  note: string;
  active: boolean;
};

const emptyForm: DealerForm = {
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  photos: '',
  note: '',
  active: true,
};

function formFromLocation(location: DealerLocation): DealerForm {
  return {
    name: location.name,
    phone: location.phone ?? '',
    address: location.address,
    city: location.city ?? '',
    state: location.state ?? '',
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    photos: location.photos.join('\n'),
    note: location.note ?? '',
    active: location.active,
  };
}

function toPayload(form: DealerForm) {
  return {
    name: form.name.trim(),
    phone: form.phone.trim() || null,
    address: form.address.trim(),
    city: form.city.trim() || null,
    state: form.state || null,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    photos: form.photos.split(/\r?\n/).map((photo) => photo.trim()).filter(Boolean),
    note: form.note.trim() || null,
    active: form.active,
  };
}

export default function DealerLocations() {
  const [locations, setLocations] = useState<DealerLocation[]>([]);
  const [form, setForm] = useState<DealerForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLocations(await api.get<DealerLocation[]>('/api/admin/dealers'));
    } catch {
      setLocations([]);
      setMessage({ type: 'error', text: '经销网点加载失败，请稍后重试。' });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setField = (key: keyof DealerForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = toPayload(form);
      if (editingId === null) {
        await api.post('/api/admin/dealers', payload);
        setMessage({ type: 'success', text: '经销网点已新增。' });
      } else {
        await api.put(`/api/admin/dealers/${editingId}`, payload);
        setMessage({ type: 'success', text: '经销网点已更新。' });
      }
      reset();
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: (error as ApiError).message });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (location: DealerLocation) => {
    if (!window.confirm(`确定删除“${location.name}”吗？`)) return;
    setMessage(null);
    try {
      await api.delete(`/api/admin/dealers/${location.id}`);
      if (editingId === location.id) reset();
      setMessage({ type: 'success', text: '经销网点已删除。' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: (error as ApiError).message });
    }
  };

  return (
    <>
      <h2>{tAdmin('dealers')}</h2>
      <p className="small muted">维护公共经销网点及其地图坐标；停用的网点不会显示在前台。</p>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <form className="panel" onSubmit={submit}>
        <h3>{editingId === null ? '新增经销网点' : '编辑经销网点'}</h3>
        <div className="form-grid-2">
          <div className="field"><label>名称</label><input value={form.name} onChange={setField('name')} required /></div>
          <div className="field"><label>电话</label><input value={form.phone} onChange={setField('phone')} /></div>
          <div className="field"><label>地址</label><input value={form.address} onChange={setField('address')} required /></div>
          <div className="field"><label>城市</label><input value={form.city} onChange={setField('city')} /></div>
          <div className="field">
            <label>州 / 领地</label>
            <select value={form.state} onChange={setField('state')}>
              <option value="">请选择</option>
              {AU_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <div className="field"><label>纬度 Latitude</label><input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={setField('latitude')} required /></div>
          <div className="field"><label>经度 Longitude</label><input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={setField('longitude')} required /></div>
        </div>
        <div className="field">
          <label>照片 URL（每行一个）</label>
          <textarea rows={3} value={form.photos} onChange={setField('photos')} placeholder="/uploads/dealers/sydney.jpg" />
        </div>
        <div className="field">
          <label>备注</label>
          <textarea rows={3} value={form.note} onChange={setField('note')} />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.active} onChange={setField('active')} />
          启用前台展示
        </label>
        <div className="action-bar">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '保存中…' : '保存网点'}</button>
          {editingId !== null && <button className="btn btn-ghost" type="button" onClick={reset}>取消编辑</button>}
        </div>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>名称</th><th>城市 / 州</th><th>地址</th><th>坐标</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr key={location.id}>
                <td>
                  <strong>{location.name}</strong>
                  {location.phone && <div className="small muted">{location.phone}</div>}
                </td>
                <td>{[location.city, location.state].filter(Boolean).join(' / ') || '—'}</td>
                <td>{location.address}</td>
                <td className="small">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</td>
                <td><span className={`badge ${statusBadgeClass(location.active ? 'ACTIVE' : 'ARCHIVED')}`}>{location.active ? '启用' : '停用'}</span></td>
                <td>
                  <button className="btn btn-outline btn-sm" type="button" onClick={() => { setEditingId(location.id); setForm(formFromLocation(location)); }}>编辑</button>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => void remove(location)} style={{ marginLeft: 6 }}>删除</button>
                </td>
              </tr>
            ))}
            {!locations.length && (
              <tr><td colSpan={6} className="muted">暂无经销网点。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

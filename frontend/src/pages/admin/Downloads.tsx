import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { fmtDate, statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface DownloadRow {
  id: number;
  title: string;
  description: string | null;
  category: string;
  originalName: string;
  mime: string;
  size: number;
  status: string;
  allowedRoles: string;
  downloadCount: number;
  createdAt: string;
}

const CATEGORIES = ['WATERMARK_CERTIFICATION', 'PRODUCT_CATALOGUE', 'INSTALLATION_DRAWINGS', 'INSTALLATION_GUIDE', 'DEALER_CONTRACT_TEMPLATE', 'TECHNICAL_DOCUMENTS', 'OTHER'];
const ROLE_OPTIONS = ['LEVEL1', 'LEVEL2', 'LEVEL3'];

export default function Downloads() {
  const [files, setFiles] = useState<DownloadRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PRODUCT_CATALOGUE');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['LEVEL1', 'LEVEL2', 'LEVEL3']);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => api.get<DownloadRow[]>('/api/admin/downloads').then(setFiles).catch(() => setFiles([]));
  useEffect(() => { void load(); }, []);

  const toggleRole = (r: string) => {
    setAllowedRoles(allowedRoles.includes(r) ? allowedRoles.filter((x) => x !== r) : [...allowedRoles, r]);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('description', description);
    fd.append('category', category);
    fd.append('allowedRoles', allowedRoles.join(','));
    fd.append('status', 'PUBLISHED');
    try {
      await api.postForm('/api/admin/downloads', fd);
      setMessage({ type: 'success', text: 'File uploaded.' });
      setTitle(''); setDescription(''); setFile(null);
      load();
    } catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
  };

  const setStatus = async (id: number, status: string) => {
    await api.put(`/api/admin/downloads/${id}`, { status });
    load();
  };

  const remove = async (id: number) => {
    await api.delete(`/api/admin/downloads/${id}`);
    load();
  };

  return (
    <>
      <h2>{tAdmin('downloads')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <form className="panel" onSubmit={upload}>
        <h3>Upload Document</h3>
        <div className="form-grid-2">
          <div className="field"><label>File (PDF)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></div>
          <div className="field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="field"><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="field"><label>Category</label><select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></div>
        </div>
        <div className="field">
          <label>Allowed Roles</label>
          <div className="flex gap-1">
            {ROLE_OPTIONS.map((r) => (
              <label key={r} className="checkbox-row"><input type="checkbox" checked={allowedRoles.includes(r)} onChange={() => toggleRole(r)} />{r}</label>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Upload</button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>File</th><th>Size</th><th>Roles</th><th>Status</th><th>Downloads</th><th></th></tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td>{f.title}</td>
                <td className="small">{f.category}</td>
                <td className="small">{f.originalName}</td>
                <td>{(f.size / 1024).toFixed(0)} KB</td>
                <td className="small">{f.allowedRoles}</td>
                <td><span className={`badge ${statusBadgeClass(f.status)}`}>{f.status}</span></td>
                <td>{f.downloadCount}</td>
                <td>
                  {f.status !== 'PUBLISHED'
                    ? <button className="btn btn-outline btn-sm" onClick={() => setStatus(f.id, 'PUBLISHED')}>Publish</button>
                    : <button className="btn btn-ghost btn-sm" onClick={() => setStatus(f.id, 'ARCHIVED')}>Archive</button>}
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => remove(f.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

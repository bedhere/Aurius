import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { RESOURCE_LABELS, SupportResource } from '../../utils/support-resources';
import '../../assets/styles/pages-admin.css';

const EMPTY = { title: '', category: 'PRODUCT_MANUAL', description: '', productId: '', certificateNumber: '', certificationScope: '', published: false };
const LABELS: Record<string, string> = { PRODUCT_MANUAL: '产品说明书', INSTALLATION_GUIDE: '安装指南', TECHNICAL_SPECIFICATION: '技术参数', MAINTENANCE_GUIDE: '日常维护说明', WATERMARK_CERTIFICATE: 'WaterMark 证书', INSTALLATION_VIDEO: '安装视频', WARRANTY_TERMS: '正式质保条款' };
interface ResourceData { resources: SupportResource[]; products: { id: number; name: string; model: string | null }[]; }

export default function Resources() {
  const [data, setData] = useState<ResourceData>({ resources: [], products: [] });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [media, setMedia] = useState({ src: '', alt: '' });
  const [mediaReady, setMediaReady] = useState(false);
  const load = () => api.get<ResourceData>('/api/admin/resources').then(setData);
  useEffect(() => { void load().catch((err: ApiError) => setMessage({ type: 'error', text: err.message }));
    api.get<{ VISION_MEDIA?: typeof media }>('/api/admin/settings').then((settings) => { setMedia(settings.VISION_MEDIA ?? { src: '', alt: '' }); setMediaReady(true); }).catch((err: ApiError) => setMessage({ type: 'error', text: err.message }));
  }, []);
  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: key === 'published' ? (event.target as HTMLInputElement).checked : event.target.value }));
  function reset() { setForm(EMPTY); setEditing(null); setFile(null); setInputKey((value) => value + 1); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      if (file && file.size > 150 * 1024 * 1024) throw new Error('文件不能超过 150 MB。');
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));
      if (file) body.append('file', file);
      await api.postForm(`/api/admin/resources${editing ? `/${editing}` : ''}`, body);
      reset(); await load(); setMessage({ type: 'success', text: '资料已保存。只有已发布且关联有效产品型号的资料才会在公开页面展示；通用质保条款可不关联型号。' });
    } catch (err) { setMessage({ type: 'error', text: (err as Error).message }); }
    finally { setBusy(false); }
  }
  async function publish(resource: SupportResource) {
    setBusy(true); setMessage(null);
    try { await api.put(`/api/admin/resources/${resource.id}`, { published: !resource.published }); await load(); }
    catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
    finally { setBusy(false); }
  }
  function edit(resource: SupportResource) {
    setEditing(resource.id); setFile(null); setInputKey((value) => value + 1);
    setForm({ title: resource.title, category: resource.category, description: resource.description, productId: resource.productId ? String(resource.productId) : '', certificateNumber: resource.certificateNumber, certificationScope: resource.certificationScope, published: resource.published });
    document.getElementById('resource-editor')?.scrollIntoView({ behavior: 'smooth' });
  }
  async function uploadVision(image: File) {
    setBusy(true); setMessage(null);
    try {
      const body = new FormData(); body.append('file', image);
      const result = await api.postForm<{ url: string }>('/api/admin/settings/vision-image', body);
      setMedia((current) => ({ ...current, src: result.url }));
      setMessage({ type: 'success', text: '场景图已上传，请点击“保存品牌场景图”发布。' });
    } catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
    finally { setBusy(false); }
  }
  async function saveMedia(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try { await api.put('/api/admin/settings', { VISION_MEDIA: media }); setMessage({ type: 'success', text: '品牌场景图已保存。' }); }
    catch (err) { setMessage({ type: 'error', text: (err as ApiError).message }); }
    finally { setBusy(false); }
  }
  return <>
    <h2>产品公开资料 / Product Resources</h2>
    <p className="muted">用于官网 SUPPORT、产品详情和质保页面。资料可以先保存为无文件草稿，收到真实文件后再编辑上传。会员下载专区继续独立管理。</p>
    {message && <Alert type={message.type}>{message.text}</Alert>}
    <form className="panel" id="resource-editor" onSubmit={save}><h3>{editing ? '编辑产品资料' : '新增产品资料'}</h3><fieldset disabled={busy} className="admin-fieldset">
      <div className="form-grid-2">
        <div className="field"><label htmlFor="resource-title">标题 *</label><input type="text" id="resource-title" value={form.title} onChange={set('title')} maxLength={200} required /></div>
        <div className="field"><label htmlFor="resource-category">资料类型 *</label><select id="resource-category" value={form.category} onChange={set('category')}>{Object.entries(RESOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{LABELS[value]} / {label}</option>)}</select></div>
        <div className="field"><label htmlFor="resource-product">对应产品型号{form.category !== 'WARRANTY_TERMS' && form.published ? ' *' : ''}</label><select id="resource-product" value={form.productId} onChange={set('productId')} required={form.published && form.category !== 'WARRANTY_TERMS'}><option value="">暂不关联 / 通用质保条款</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.model ? `${product.model} — ` : ''}{product.name}</option>)}</select></div>
        <div className="field"><label htmlFor="resource-file">文件（可后续添加）</label><input key={inputKey} id="resource-file" type="file" accept={form.category === 'INSTALLATION_VIDEO' ? '.mp4,.webm' : '.pdf,.jpg,.jpeg,.png'} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><p className="hint">PDF / JPG / PNG；安装视频 MP4 / WebM，最大 150 MB。编辑时不选文件则保留原文件。</p></div>
      </div>
      <div className="field"><label htmlFor="resource-description">内容说明</label><textarea id="resource-description" rows={3} maxLength={4000} value={form.description} onChange={set('description')} /></div>
      {form.category === 'WATERMARK_CERTIFICATE' && <div className="form-grid-2"><div className="field"><label htmlFor="resource-certificate">证书编号（发布时必填）</label><input type="text" id="resource-certificate" value={form.certificateNumber} onChange={set('certificateNumber')} required={form.published} maxLength={200} /></div><div className="field"><label htmlFor="resource-scope">实际认证主体、型号及范围（发布时必填）</label><textarea id="resource-scope" value={form.certificationScope} onChange={set('certificationScope')} required={form.published} maxLength={2000} /></div></div>}
      <label className="checkbox-row"><input type="checkbox" checked={form.published} onChange={set('published')} />发布到官网（确认资料真实、型号及认证范围正确后勾选）</label>
      <div className="flex gap-1 mt-2"><button className="btn btn-primary" type="submit">保存资料</button>{editing && <button type="button" className="btn btn-outline" onClick={reset}>取消编辑</button>}</div>
    </fieldset></form>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>标题</th><th>类型 / 型号</th><th>文件</th><th>状态</th><th>操作</th></tr></thead><tbody>
      {!data.resources.length && <tr><td colSpan={5}>暂无资料。可先新增草稿，后续再上传真实文件。</td></tr>}
      {data.resources.map((resource) => <tr key={resource.id}><td>{resource.title}</td><td>{LABELS[resource.category]}<br /><span className="muted small">{data.products.find((product) => product.id === resource.productId)?.model || (resource.productId ? `#${resource.productId}` : '尚未关联型号 / 通用')}</span></td><td>{resource.originalName || '待上传'}</td><td>{resource.published ? '已发布' : '草稿'}</td><td><div className="flex gap-1"><button className="btn btn-outline btn-sm" disabled={busy} onClick={() => edit(resource)}>编辑 / 补文件</button><button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => publish(resource)}>{resource.published ? '撤下' : '发布'}</button></div></td></tr>)}
    </tbody></table></div>
    <form className="panel mt-3" onSubmit={saveMedia}><h3>VISION 品牌场景图</h3><p className="muted small">未添加图片时展示品牌文字框架。这里保存只影响品牌理念页，不更改首页或联系方式。</p><fieldset disabled={busy || !mediaReady} className="admin-fieldset"><div className="field"><label htmlFor="vision-file">上传产品场景图</label><input id="vision-file" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => { const image = event.target.files?.[0]; if (image) void uploadVision(image); }} /></div><div className="field"><label htmlFor="vision-alt">图片说明</label><input type="text" id="vision-alt" value={media.alt} onChange={(event) => setMedia({ ...media, alt: event.target.value })} /></div>{media.src && <img className="resource-admin-preview" src={media.src} alt={media.alt || '场景图预览'} />}<div className="flex gap-1 mt-2"><button className="btn btn-primary" type="submit">保存品牌场景图</button><button className="btn btn-ghost" type="button" onClick={() => setMedia({ src: '', alt: '' })}>清除图片选择</button></div></fieldset></form>
  </>;
}

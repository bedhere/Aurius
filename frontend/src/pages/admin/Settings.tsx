import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { HomepageMediaItem } from '../../api/types';
import { tAdmin } from '../../i18n/strings';
import { defaultHomepageMedia } from '../../utils/homepage-media';
import '../../assets/styles/pages-admin.css';

interface Settings {
  BANK_ACCOUNT: { bankName: string; bsb: string; accountName: string; accountNumber: string; instructions: string };
  SHIPPING_METHODS: { id: string; name: string; fee: number }[];
  COMPANY_CONTACT: { phone: string; email: string; address: string; hours: string };
  HOMEPAGE_MEDIA: HomepageMediaItem[];
}

const defaultBank = { bankName: '', bsb: '', accountName: '', accountNumber: '', instructions: '' };
const defaultContact = { phone: '', email: '', address: '', hours: '' };
const defaultSlide = (): HomepageMediaItem => ({ id: crypto.randomUUID(), type: 'image', src: '', poster: '', title: '', caption: '', link: '', alt: '' });

export default function Settings() {
  const [bank, setBank] = useState(defaultBank);
  const [contact, setContact] = useState(defaultContact);
  const [shipping, setShipping] = useState<{ id: string; name: string; fee: number }[]>([]);
  const [homepageMedia, setHomepageMedia] = useState<HomepageMediaItem[]>([defaultSlide()]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    api.get<Settings>('/api/admin/settings').then((s) => {
      setBank(s.BANK_ACCOUNT ?? defaultBank);
      setContact(s.COMPANY_CONTACT ?? defaultContact);
      setShipping(s.SHIPPING_METHODS ?? []);
      setHomepageMedia(s.HOMEPAGE_MEDIA?.length ? s.HOMEPAGE_MEDIA : defaultHomepageMedia.map((item) => ({ ...item })));
    }).catch(() => setLoadFailed(true)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setBankField = (k: keyof typeof defaultBank) => (e: React.ChangeEvent<HTMLInputElement>) => setBank({ ...bank, [k]: e.target.value });
  const setContactField = (k: keyof typeof defaultContact) => (e: React.ChangeEvent<HTMLInputElement>) => setContact({ ...contact, [k]: e.target.value });

  const setShip = (i: number, k: keyof { id: string; name: string; fee: number }) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = [...shipping];
    next[i] = { ...next[i], [k]: k === 'fee' ? Number(e.target.value) : e.target.value };
    setShipping(next);
  };

  const setSlide = (i: number, k: keyof HomepageMediaItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = [...homepageMedia];
    next[i] = { ...next[i], [k]: e.target.value } as HomepageMediaItem;
    setHomepageMedia(next);
  };

  const uploadSlide = async (id: string, file: File) => {
    if (uploadingId) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片不能超过 10 MB。' });
      return;
    }
    setUploadingId(id);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api.postForm<{ url: string }>('/api/admin/settings/homepage-images', body);
      setHomepageMedia((current) => current.map((item) => item.id === id ? { ...item, src: result.url } : item));
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message || '图片上传失败，请重试。' });
    } finally {
      setUploadingId(null);
    }
  };

  const moveSlide = (index: number, offset: -1 | 1) => {
    setHomepageMedia((current) => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    if (loading || loadFailed || uploadingId || saving) return;
    if (homepageMedia.some((item) => !item.src.trim())) {
      setMessage({ type: 'error', text: '请为新增的轮播素材上传图片或填写地址，也可以先移除空白素材。' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api/admin/settings', {
        BANK_ACCOUNT: bank,
        SHIPPING_METHODS: shipping,
        COMPANY_CONTACT: contact,
        HOMEPAGE_MEDIA: homepageMedia.map((item) => ({ ...item, src: item.src.trim() })),
      });
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2>{tAdmin('settings')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}
      {loading && <p role="status">正在加载设置…</p>}
      {loadFailed && <Alert type="error">设置加载失败，请重试后再保存。<button className="btn btn-outline btn-sm" onClick={load}>重试</button></Alert>}

      <div className="panel">
        <h3>银行收款账户 (Bank Account)</h3>
        <div className="form-grid-2">
          <div className="field"><label>Bank Name</label><input value={bank.bankName} onChange={setBankField('bankName')} /></div>
          <div className="field"><label>BSB</label><input value={bank.bsb} onChange={setBankField('bsb')} /></div>
          <div className="field"><label>Account Name</label><input value={bank.accountName} onChange={setBankField('accountName')} /></div>
          <div className="field"><label>Account Number</label><input value={bank.accountNumber} onChange={setBankField('accountNumber')} /></div>
          <div className="field"><label>Instructions</label><input value={bank.instructions} onChange={setBankField('instructions')} /></div>
        </div>
      </div>

      <fieldset className="panel homepage-media-editor" disabled={loading || loadFailed || saving || uploadingId !== null}>
        <legend>首页轮播 / 视频 (Homepage Media)</legend>
        <p className="small muted">按下方顺序每 5 秒自动切换。支持 JPG、PNG、WebP 图片，单张最大 10 MB；建议使用 2.85:1 横图（如 2280 × 800），重要文字请留在安全区域。上传、排序或移除后，点击页面底部“保存设置”生效。</p>
        {homepageMedia.map((item, i) => (
          <section className="homepage-media-editor__item" key={item.id} aria-label={`轮播素材 ${i + 1}`}>
            <div className="homepage-media-editor__actions">
              <strong>轮播素材 {i + 1}</strong>
              <button className="btn btn-outline btn-sm" disabled={i === 0} onClick={() => moveSlide(i, -1)} aria-label={`上移轮播素材 ${i + 1}`}>上移</button>
              <button className="btn btn-outline btn-sm" disabled={i === homepageMedia.length - 1} onClick={() => moveSlide(i, 1)} aria-label={`下移轮播素材 ${i + 1}`}>下移</button>
              <button className="btn btn-outline btn-sm" disabled={homepageMedia.length <= 1} onClick={() => setHomepageMedia((current) => current.filter((slide) => slide.id !== item.id))}>移除</button>
            </div>
            <div className="form-grid-2">
              <div className="field"><label htmlFor={`slide-type-${item.id}`}>类型</label><select id={`slide-type-${item.id}`} value={item.type} onChange={setSlide(i, 'type')}><option value="image">图片</option><option value="video">视频</option></select></div>
              <div className="field"><label htmlFor={`slide-source-${item.id}`}>素材地址</label><input id={`slide-source-${item.id}`} value={item.src} onChange={setSlide(i, 'src')} placeholder="/uploads/..." /></div>
              {item.type === 'image' ? (
                <div className="field"><label htmlFor={`slide-upload-${item.id}`}>{item.src ? '更换图片' : '上传图片'}</label><input id={`slide-upload-${item.id}`} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  if (file) void uploadSlide(item.id, file);
                }} />{uploadingId === item.id && <span className="small muted" role="status">上传中…</span>}</div>
              ) : <div className="field"><label htmlFor={`slide-poster-${item.id}`}>视频封面地址</label><input id={`slide-poster-${item.id}`} value={item.poster ?? ''} onChange={setSlide(i, 'poster')} /></div>}
              <div className="field"><label htmlFor={`slide-alt-${item.id}`}>图片描述</label><input id={`slide-alt-${item.id}`} value={item.alt ?? ''} onChange={setSlide(i, 'alt')} /></div>
              <div className="field"><label>Title</label><input value={item.title ?? ''} onChange={setSlide(i, 'title')} /></div>
              <div className="field"><label>Caption</label><input value={item.caption ?? ''} onChange={setSlide(i, 'caption')} /></div>
              <div className="field"><label>Link</label><input value={item.link ?? ''} onChange={setSlide(i, 'link')} /></div>
            </div>
            {item.src && (item.type === 'image'
              ? <img className="homepage-media-editor__preview" src={item.src} alt={item.alt || `轮播素材 ${i + 1} 预览`} />
              : <video className="homepage-media-editor__preview" src={item.src} poster={item.poster || undefined} controls preload="metadata" />)}
          </section>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setHomepageMedia((current) => [...current, defaultSlide()])}>+ 添加轮播素材</button>
      </fieldset>

      <div className="panel">
        <h3>物流方式 (Shipping Methods)</h3>
        {shipping.map((m, i) => (
          <div className="form-grid-3" key={i} style={{ marginBottom: 10 }}>
            <div className="field"><label>ID</label><input value={m.id} onChange={setShip(i, 'id')} /></div>
            <div className="field"><label>Name</label><input value={m.name} onChange={setShip(i, 'name')} /></div>
            <div className="field"><label>Fee (AUD)</label><input type="number" step="0.01" value={m.fee} onChange={setShip(i, 'fee')} /></div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setShipping([...shipping, { id: '', name: '', fee: 0 }])}>+ Add method</button>
      </div>

      <div className="panel">
        <h3>公司联系信息 (Company Contact)</h3>
        <div className="form-grid-2">
          <div className="field"><label>Phone</label><input value={contact.phone} onChange={setContactField('phone')} /></div>
          <div className="field"><label>Email</label><input value={contact.email} onChange={setContactField('email')} /></div>
          <div className="field"><label>Address</label><input value={contact.address} onChange={setContactField('address')} /></div>
          <div className="field"><label>Hours</label><input value={contact.hours} onChange={setContactField('hours')} /></div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving || loading || loadFailed || uploadingId !== null}>{saving ? '保存中…' : '保存设置'}</button>
    </>
  );
}

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert } from '../../components/ui';
import { HomepageMediaItem } from '../../api/types';
import { tAdmin } from '../../i18n/strings';
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

  useEffect(() => {
    api.get<Settings>('/api/admin/settings').then((s) => {
      setBank(s.BANK_ACCOUNT ?? defaultBank);
      setContact(s.COMPANY_CONTACT ?? defaultContact);
      setShipping(s.SHIPPING_METHODS ?? []);
      setHomepageMedia(s.HOMEPAGE_MEDIA?.length ? s.HOMEPAGE_MEDIA : [defaultSlide()]);
    }).catch(() => undefined);
  }, []);

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

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api/admin/settings', {
        BANK_ACCOUNT: bank,
        SHIPPING_METHODS: shipping,
        COMPANY_CONTACT: contact,
        HOMEPAGE_MEDIA: homepageMedia.filter((item) => item.src.trim()),
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

      <div className="panel">
        <h3>首页轮播 / 视频 (Homepage Media)</h3>
        {homepageMedia.map((item, i) => (
          <div className="form-grid-2" key={item.id} style={{ marginBottom: 10 }}>
            <div className="field"><label>Type</label><select value={item.type} onChange={setSlide(i, 'type')}><option value="image">Image</option><option value="video">Video</option></select></div>
            <div className="field"><label>Source</label><input value={item.src} onChange={setSlide(i, 'src')} placeholder="/uploads/..." /></div>
            <div className="field"><label>Poster</label><input value={item.poster ?? ''} onChange={setSlide(i, 'poster')} placeholder="Optional poster for video" /></div>
            <div className="field"><label>Title</label><input value={item.title ?? ''} onChange={setSlide(i, 'title')} /></div>
            <div className="field"><label>Caption</label><input value={item.caption ?? ''} onChange={setSlide(i, 'caption')} /></div>
            <div className="field"><label>Link</label><input value={item.link ?? ''} onChange={setSlide(i, 'link')} /></div>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => setHomepageMedia([...homepageMedia, defaultSlide()])}>+ Add media</button>
      </div>

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

      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
    </>
  );
}

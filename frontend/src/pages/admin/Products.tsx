import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import '../../assets/styles/pages-admin.css';

interface ProductRow {
  id: number;
  productCode: string;
  sku: string;
  name: string;
  category: string;
  model: string | null;
  stock: number;
  status: string;
  displayOrder: number;
  displayStyle: string | null;
  series: string | null;
  giftable: boolean;
  promotionNote: string | null;
  dimensionSpec: string | null;
  prices: { retail: number | null; promo: number | null; waterworker: number | null; builder: number | null; distributor2: number | null; dealer1: number | null; level1: number; level2: number; level3: number; rrp: number | null } | null;
  images: string[];
}

interface ProductDetailResponse extends ProductRow {
  description: string;
  specs: Record<string, unknown> | null;
  dimensionImage: string | null;
  featureImage: string | null;
}

const empty = {
  productCode: '', sku: '', name: '', category: 'Smart Toilet', model: '', description: '', stock: 0, status: 'ACTIVE',
  specs: '', displayStyle: 'carousel', series: '', promotionNote: '', dimensionSpec: '', dimensionImage: '', featureImage: '', giftable: false, sendPromotion: false,
  level1Price: 0, level2Price: 0, level3Price: 0, retailPrice: '', promoPrice: '', waterworkerPrice: '', builderPrice: '', distributor2Price: '', dealer1Price: '', rrp: '',
};

export default function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProductRow[]; total: number; page: number; pageSize: number } | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingDiagram, setUploadingDiagram] = useState<'dimensionImage' | 'featureImage' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    api.get(`/api/admin/products?${params.toString()}`).then(setData).catch(() => setData(null));
  };

  useEffect(load, [search, category, page]);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.type === 'number' ? e.target.value : e.target.value;
    setForm((current) => ({ ...current, [k]: v } as typeof empty));
  };

  const uploadImage = async (f: File) => {
    const fd = new FormData();
    fd.append('file', f);
    const r = await api.postForm<{ url: string }>('/api/admin/products/images', fd);
    setImages([...images, r.url]);
  };

  const uploadDiagram = async (file: File, field: 'dimensionImage' | 'featureImage') => {
    if (uploadingDiagram) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片不能超过 10 MB。' });
      return;
    }
    setUploadingDiagram(field);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api.postForm<{ url: string }>('/api/admin/products/images', body);
      setForm((current) => ({ ...current, [field]: result.url }));
    } catch (error) {
      setMessage({ type: 'error', text: (error as ApiError).message || '图片上传失败，请重试。' });
    } finally {
      setUploadingDiagram(null);
    }
  };

  const moveProduct = async (index: number, offset: number) => {
    const items = data?.items ?? [];
    const product = items[index];
    const target = items[index + offset];
    if (!product || !target) return;
    try {
      await api.put('/api/admin/products/reorder', { id: product.id, targetId: target.id });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const archiveProduct = async (product: ProductRow) => {
    if (!window.confirm(`Archive ${product.name}? It will no longer appear on the website.`)) return;
    try {
      await api.delete(`/api/admin/products/${product.id}`);
      setMessage({ type: 'success', text: 'Product archived.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const permanentlyDeleteProduct = async (product: ProductRow) => {
    if (!window.confirm(`Permanently delete ${product.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/products/${product.id}/permanent`);
      setMessage({ type: 'success', text: 'Product permanently deleted.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingDiagram) return;
    setMessage(null);
    const specs = form.specs.trim() ? (() => { try { return JSON.parse(form.specs); } catch { return null; } })() : null;
    const payload = {
      ...form,
      specs,
      images,
      dimensionImage: form.dimensionImage || null,
      featureImage: form.featureImage || null,
      stock: Number(form.stock),
      level1Price: Number(form.level1Price),
      level2Price: Number(form.level2Price),
      level3Price: Number(form.level3Price),
      retailPrice: form.retailPrice === '' ? null : Number(form.retailPrice),
      promoPrice: form.promoPrice === '' ? null : Number(form.promoPrice),
      waterworkerPrice: form.waterworkerPrice === '' ? null : Number(form.waterworkerPrice),
      builderPrice: form.builderPrice === '' ? null : Number(form.builderPrice),
      distributor2Price: form.distributor2Price === '' ? null : Number(form.distributor2Price),
      dealer1Price: form.dealer1Price === '' ? null : Number(form.dealer1Price),
      rrp: form.rrp === '' ? null : Number(form.rrp),
    };
    try {
      if (editingId) await api.put(`/api/admin/products/${editingId}`, payload);
      else await api.post('/api/admin/products', payload);
      setMessage({ type: 'success', text: 'Product saved.' });
      setShowForm(false);
      setForm(empty);
      setImages([]);
      setEditingId(null);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const startEdit = async (p: ProductRow) => {
    if (uploadingDiagram) return;
    const detail = await api.get<ProductDetailResponse>(`/api/admin/products/${p.id}`).catch(() => null);
    if (!detail) {
      setMessage({ type: 'error', text: 'Unable to load product details.' });
      return;
    }
    setEditingId(p.id);
    setForm({
      ...empty,
      productCode: detail.productCode,
      sku: detail.sku,
      name: detail.name,
      category: detail.category,
      model: detail.model ?? '',
      description: detail.description,
      specs: detail.specs ? JSON.stringify(detail.specs, null, 2) : '',
      stock: detail.stock,
      status: detail.status,
      displayStyle: detail.displayStyle ?? 'carousel',
      series: detail.series ?? '',
      giftable: detail.giftable,
      promotionNote: detail.promotionNote ?? '',
      dimensionSpec: detail.dimensionSpec ?? '',
      dimensionImage: detail.dimensionImage ?? '',
      featureImage: detail.featureImage ?? '',
      level1Price: detail.prices?.level1 ?? 0,
      level2Price: detail.prices?.level2 ?? 0,
      level3Price: detail.prices?.level3 ?? 0,
      retailPrice: detail.prices?.retail?.toString() ?? '',
      promoPrice: detail.prices?.promo?.toString() ?? '',
      waterworkerPrice: detail.prices?.waterworker?.toString() ?? '',
      builderPrice: detail.prices?.builder?.toString() ?? '',
      distributor2Price: detail.prices?.distributor2?.toString() ?? '',
      dealer1Price: detail.prices?.dealer1?.toString() ?? '',
      rrp: detail.prices?.rrp?.toString() ?? '',
    });
    setImages(detail.images);
    setShowForm(true);
  };

  return (
    <>
      <h2>{tAdmin('products')}</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="admin-filters">
        <input type="text" placeholder="Search…" onKeyDown={(e) => { if (e.key === 'Enter') { setSearch((e.target as HTMLInputElement).value.trim()); setPage(1); } }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          <option>Smart Toilet</option>
          <option>Toilet Lid</option>
          <option>Whole-House Water Purification</option>
          <option>Filter Cartridge</option>
          <option>Shower Filtration</option>
          <option>Engineering Custom Floor Drain</option>
        </select>
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" disabled={uploadingDiagram !== null} onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(empty); setImages([]); }}>
          + New Product
        </button>
      </div>

      {showForm && (
        <form className="panel" onSubmit={submit}>
          <h3>{editingId ? 'Edit Product' : 'New Product'}</h3>
          <div className="form-grid-2">
            <div className="field"><label>Product Code</label><input value={form.productCode} onChange={set('productCode')} required /></div>
            <div className="field"><label>SKU</label><input value={form.sku} onChange={set('sku')} required /></div>
            <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
            <div className="field"><label>Category</label><select value={form.category} onChange={set('category')}><option>Smart Toilet</option><option>Toilet Lid</option><option>Whole-House Water Purification</option><option>Filter Cartridge</option><option>Shower Filtration</option><option>Engineering Custom Floor Drain</option></select></div>
            <div className="field"><label>Model</label><input value={form.model} onChange={set('model')} /></div>
            <div className="field"><label>Stock</label><input type="number" value={form.stock} onChange={set('stock')} /></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={set('status')}><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="ARCHIVED">ARCHIVED</option></select></div>
            <div className="field"><label>Display Style</label><input value={form.displayStyle} onChange={set('displayStyle')} /></div>
            <div className="field"><label>Series</label><input value={form.series} onChange={set('series')} placeholder="锐净 / 赛博" /></div>
            <div className="field"><label>RRP</label><input type="number" step="0.01" value={form.rrp} onChange={set('rrp')} /></div>
            <div className="field"><label>Giftable</label><input type="checkbox" checked={form.giftable} onChange={set('giftable')} /></div>
          </div>
          <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
          <div className="field"><label>Promotion Note</label><textarea value={form.promotionNote} onChange={set('promotionNote')} /></div>
          <div className="field"><label>Dimension Spec</label><textarea value={form.dimensionSpec} onChange={set('dimensionSpec')} /></div>
          <div className="form-grid-3">
            <div className="field"><label>Retail</label><input type="number" step="0.01" value={form.retailPrice} onChange={set('retailPrice')} /></div>
            <div className="field"><label>Promo</label><input type="number" step="0.01" value={form.promoPrice} onChange={set('promoPrice')} /></div>
            <div className="field"><label>Waterworker</label><input type="number" step="0.01" value={form.waterworkerPrice} onChange={set('waterworkerPrice')} /></div>
            <div className="field"><label>Builder</label><input type="number" step="0.01" value={form.builderPrice} onChange={set('builderPrice')} /></div>
            <div className="field"><label>Distributor 2</label><input type="number" step="0.01" value={form.distributor2Price} onChange={set('distributor2Price')} /></div>
            <div className="field"><label>Dealer 1</label><input type="number" step="0.01" value={form.dealer1Price} onChange={set('dealer1Price')} /></div>
            <div className="field"><label>Level 1</label><input type="number" step="0.01" value={form.level1Price} onChange={set('level1Price')} required /></div>
            <div className="field"><label>Level 2</label><input type="number" step="0.01" value={form.level2Price} onChange={set('level2Price')} required /></div>
            <div className="field"><label>Level 3</label><input type="number" step="0.01" value={form.level3Price} onChange={set('level3Price')} required /></div>
          </div>
          <div className="field"><label>Specs (JSON, optional)</label><textarea value={form.specs} onChange={set('specs')} placeholder='{"sizes":["S86","S90"],"colors":["White"],"features":["Heated Seat"]}' /></div>
          <div className="field">
            <label>Images</label>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); }} />
            <div className="flex gap-1 wrap mt-1">{images.map((u, index) => (
              <div className="product-image" key={`${u}-${index}`}>
                <img src={u} className="img-thumb" alt="" />
                <button className="btn btn-outline btn-sm" type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>Remove</button>
              </div>
            ))}</div>
          </div>
          <fieldset className="product-diagram-admin" disabled={uploadingDiagram !== null}>
            <legend>尺寸图与功能图</legend>
            <p className="small muted">分别上传，显示在详情页购买按钮下方，不加入产品主图。支持 JPG、PNG、WebP，单张最大 10 MB；上传或移除后，请点击 Save 保存。</p>
            <div className="form-grid-2">
              {(['dimensionImage', 'featureImage'] as const).map((field) => (
                <div className="field product-diagram-admin__field" key={field}>
                  <label htmlFor={`product-${field}`}>{field === 'dimensionImage' ? '尺寸图' : '功能图'}</label>
                  <input id={`product-${field}`} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void uploadDiagram(file, field);
                  }} />
                  {uploadingDiagram === field && <span className="small muted" role="status">上传中…</span>}
                  {form[field] ? (
                    <div className="product-diagram-admin__preview">
                      <a href={form[field]} target="_blank" rel="noreferrer"><img src={form[field]} alt={field === 'dimensionImage' ? '尺寸图预览' : '功能图预览'} /></a>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setForm((current) => ({ ...current, [field]: '' }))}>移除图片</button>
                    </div>
                  ) : <span className="small muted">未上传，前台不显示此区域。</span>}
                </div>
              ))}
            </div>
          </fieldset>
          <div className="field"><label>Send promotion email</label><input type="checkbox" checked={form.sendPromotion} onChange={set('sendPromotion')} /></div>
          <button className="btn btn-primary" type="submit" disabled={uploadingDiagram !== null}>Save</button>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th><th>Name</th><th>SKU</th><th>Category</th><th>Series</th><th>Gift</th><th>Stock</th><th>Status</th><th>Prices</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p, index, items) => (
              <tr key={p.id}>
                <td><img src={p.images[0] ?? '/favicon.svg'} className="img-thumb" alt="" /></td>
                <td>{p.name}</td>
                <td className="small">{p.sku}</td>
                <td>{p.category}</td>
                <td className="small">{p.series ?? '—'}</td>
                <td>{p.giftable ? 'Yes' : 'No'}</td>
                <td>{p.stock}</td>
                <td><span className={`badge ${statusBadgeClass(p.status)}`}>{p.status}</span></td>
                <td className="small">{p.prices ? `${p.prices.retail ?? '—'} / ${p.prices.promo ?? '—'} / ${p.prices.level1} / ${p.prices.level2} / ${p.prices.level3}` : '—'}</td>
                <td>
                  <div className="product-actions">
                    <button className="btn btn-outline btn-sm" disabled={index === 0} onClick={() => moveProduct(index, -1)}>↑</button>
                    <button className="btn btn-outline btn-sm" disabled={index === items.length - 1} onClick={() => moveProduct(index, 1)}>↓</button>
                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Edit</button>
                    {p.status !== 'ARCHIVED' && <button className="btn btn-outline btn-sm" onClick={() => archiveProduct(p)}>Archive</button>}
                    {p.status === 'ARCHIVED' && <button className="btn btn-outline btn-sm" onClick={() => permanentlyDeleteProduct(p)}>Delete permanently</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

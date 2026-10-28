import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { Alert, Pagination } from '../../components/ui';
import { statusBadgeClass } from '../../utils/format';
import { tAdmin } from '../../i18n/strings';
import { usesRemoteOnlyPresentation } from '../../utils/product-media';
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
  remoteImage: string | null;
  featureImage: string | null;
}

const empty = {
  productCode: '', sku: '', name: '', category: 'Smart Toilet', model: '', description: '', stock: 0, status: 'ACTIVE',
  specs: '', displayStyle: 'carousel', series: '', promotionNote: '', dimensionSpec: '', remoteImage: '', dimensionImage: '', featureImage: '', giftable: false, sendPromotion: false,
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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingDiagram, setUploadingDiagram] = useState<'remoteImage' | 'dimensionImage' | 'featureImage' | null>(null);
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

  const uploadImages = async (files: File[]) => {
    if (!files.length || uploadingImages) return;
    setUploadingImages(true);
    setMessage(null);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10 MB。');
        const body = new FormData();
        body.append('file', file);
        const result = await api.postForm<{ url: string }>('/api/admin/products/images', body);
        setImages((current) => [...current, result.url]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message || '图片上传失败，请重试。' });
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadDiagram = async (file: File, field: 'remoteImage' | 'dimensionImage' | 'featureImage') => {
    if (uploadingDiagram || uploadingImages) return;
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
    if (uploadingDiagram || uploadingImages) return;
    setMessage(null);
    const specs = form.specs.trim() ? (() => { try { return JSON.parse(form.specs); } catch { return null; } })() : null;
    const payload = {
      ...form,
      specs,
      images,
      remoteImage: form.remoteImage || null,
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
    if (uploadingDiagram || uploadingImages) return;
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
      remoteImage: detail.remoteImage ?? '',
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
        <button className="btn btn-primary btn-sm" disabled={uploadingImages || uploadingDiagram !== null} onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(empty); setImages([]); }}>
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
            <div className="field"><label>Plumber Account（水工采购价，可留空）</label><input type="number" step="0.01" value={form.waterworkerPrice} onChange={set('waterworkerPrice')} /></div>
            <div className="field"><label>Builder Account（建筑商采购价，可留空）</label><input type="number" step="0.01" value={form.builderPrice} onChange={set('builderPrice')} /></div>
            <div className="field"><label>Authorised Dealer（分销商采购价，可留空）</label><input type="number" step="0.01" value={form.distributor2Price} onChange={set('distributor2Price')} /></div>
            <div className="field"><label>Regional Distributor（一级代理采购价，可留空）</label><input type="number" step="0.01" value={form.dealer1Price} onChange={set('dealer1Price')} /></div>
            <div className="field"><label>Level 1</label><input type="number" step="0.01" value={form.level1Price} onChange={set('level1Price')} required /></div>
            <div className="field"><label>Level 2</label><input type="number" step="0.01" value={form.level2Price} onChange={set('level2Price')} required /></div>
            <div className="field"><label>Level 3</label><input type="number" step="0.01" value={form.level3Price} onChange={set('level3Price')} required /></div>
          </div>
          <div className="field"><label>Specs (JSON, optional)</label><textarea value={form.specs} onChange={set('specs')} placeholder='{"sizes":["S86","S90"],"colors":["White"],"features":["Heated Seat"]}' /></div>
          <div className="field">
            <label>Images</label>
            {usesRemoteOnlyPresentation(form) && <p className="small muted">下方的“智能马桶主图”优先展示；这里的图片会作为详情页缩略图，点击即可切换大图。未设置主图时使用这里的第一张图片。</p>}
            <input id="product-gallery-images" type="file" accept=".jpg,.jpeg,.png,.webp" multiple disabled={uploadingImages || uploadingDiagram !== null} onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void uploadImages(files); }} />
            <p className="small muted">支持 JPG、PNG、WebP，单张最大 10 MB，可一次选择多张。上传完成后请点击 Save 保存。</p>
            {uploadingImages && <span className="small muted" role="status">图片上传中…</span>}
            <div className="flex gap-1 wrap mt-1">{images.map((u, index) => (
              <div className="product-image" key={`${u}-${index}`}>
                <img src={u} className="img-thumb" alt="" />
                <button className="btn btn-outline btn-sm" type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}>Remove</button>
              </div>
            ))}</div>
          </div>
          <fieldset className="product-diagram-admin" disabled={uploadingImages || uploadingDiagram !== null}>
            <legend>主图、尺寸图与功能图</legend>
            <p className="small muted">智能马桶默认展示主图，并可通过 Images 中的缩略图切换图片；尺寸图在详情页信息区显示。马桶和马桶盖的功能图在详情页下方通栏放大显示。支持 JPG、PNG、WebP，单张最大 10 MB；上传新图可替换，移除后不再显示原图，请点击 Save 保存。</p>
            <div className="form-grid-2">
              {(['remoteImage', 'dimensionImage', 'featureImage'] as const).map((field) => (
                <div className="field product-diagram-admin__field" key={field}>
                  <label htmlFor={`product-${field}`}>{field === 'remoteImage' ? '智能马桶主图（马桶 / 遥控器图片）' : field === 'dimensionImage' ? '尺寸图' : '功能图'}</label>
                  <input id={`product-${field}`} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (file) void uploadDiagram(file, field);
                  }} />
                  {uploadingDiagram === field && <span className="small muted" role="status">上传中…</span>}
                  {form[field] ? (
                    <div className="product-diagram-admin__preview">
                      <a href={form[field]} target="_blank" rel="noreferrer"><img src={form[field]} alt={field === 'remoteImage' ? '主图预览' : field === 'dimensionImage' ? '尺寸图预览' : '功能图预览'} /></a>
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setForm((current) => ({ ...current, [field]: '' }))}>移除图片</button>
                    </div>
                  ) : <span className="small muted">{field === 'remoteImage' ? '未设置主图，将使用 Images 中的第一张图片；没有图片时显示占位图。' : '未上传，前台不显示此区域。'}</span>}
                </div>
              ))}
            </div>
          </fieldset>
          <div className="field"><label>Send promotion email</label><input type="checkbox" checked={form.sendPromotion} onChange={set('sendPromotion')} /></div>
          <button className="btn btn-primary" type="submit" disabled={uploadingImages || uploadingDiagram !== null}>Save</button>
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
                    <button className="btn btn-outline btn-sm" disabled={uploadingImages || uploadingDiagram !== null} onClick={() => startEdit(p)}>Edit</button>
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

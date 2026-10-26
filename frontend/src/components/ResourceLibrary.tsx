import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useI18n } from '../i18n/LanguageContext';
import { RESOURCE_LABELS, SupportResource } from '../utils/support-resources';
import { Alert } from './ui';
import '../assets/styles/pages-public.css';

const DEFAULT_CATEGORIES = Object.keys(RESOURCE_LABELS).filter((category) => category !== 'WARRANTY_TERMS');

export function ResourceLibrary({ productId, categories = DEFAULT_CATEGORIES }: { productId?: number; categories?: string[] }) {
  const { t } = useI18n();
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [model, setModel] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.get<SupportResource[]>(`/api/support/resources${productId ? `?productId=${productId}` : ''}`)
      .then((data) => { if (active) setResources(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, retry]);
  const products = useMemo(() => [...new Map(resources.filter((resource) => categories.includes(resource.category) && resource.product)
    .map((resource) => [resource.product!.id, resource.product!])).values()], [resources, categories]);
  if (loading) return <p role="status">{t('common.loading')}</p>;
  if (error) return <Alert type="error"><p>{t('Product resources could not be loaded. Please try again.')}</p><button className="btn btn-outline" onClick={() => setRetry((value) => value + 1)}>{t('common.retry')}</button></Alert>;
  return <div className="resource-library">
    {!productId && products.length > 0 && <div className="field resource-model-filter"><label htmlFor="resource-model">{t('Product model')}</label><select id="resource-model" value={model} onChange={(event) => setModel(event.target.value)}><option value="">{t('All models')}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.model || product.name}</option>)}</select></div>}
    <div className={`resource-grid${categories.length === 1 ? ' resource-grid--single' : ''}`}>{categories.map((category) => {
      const items = resources.filter((resource) => resource.category === category && (!model || !resource.productId || resource.productId === Number(model)));
      return <article className="resource-category" key={category}>
        <span className="resource-category__label">{category === 'INSTALLATION_VIDEO' ? 'VIDEO' : category === 'WATERMARK_CERTIFICATE' ? 'WaterMark' : 'AURIUS'}</span>
        <h3>{t(RESOURCE_LABELS[category])}</h3>
        {items.length ? <ul className="resource-items">{items.map((resource) => <li key={resource.id}>
          <h4>{resource.title}</h4>
          {resource.product && <p className="small muted">{t('Product model')}: {resource.product.model || resource.product.name}</p>}
          {resource.description && <p>{resource.description}</p>}
          {resource.certificateNumber && <p className="small">{t('Certificate number')}: {resource.certificateNumber}</p>}
          {resource.certificationScope && <p className="small">{t('Certification scope')}: {resource.certificationScope}</p>}
          {resource.mime?.startsWith('video/') ? <video src={resource.fileUrl} controls preload="none" aria-label={resource.title} /> : <a className="btn btn-outline btn-sm" href={resource.fileUrl} target="_blank" rel="noopener noreferrer">{t('View / Download')}</a>}
        </li>)}</ul> : <div className="resource-empty"><p>{t('Documentation coming soon.')}</p><p className="small muted">{t(category === 'WATERMARK_CERTIFICATE' ? 'Certification information will be published for the specific product model once verified.' : category === 'WARRANTY_TERMS' ? 'The full warranty terms will be published here when available. Please contact AURIUS for assistance.' : 'Please contact AURIUS for information for your product model.')}</p></div>}
      </article>;
    })}</div>
  </div>;
}

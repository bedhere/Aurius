import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ProductItem } from '../../api/types';
import { Alert, Pagination, PriceDisplay } from '../../components/ui';
import { useI18n } from '../../i18n/LanguageContext';
import { groupOverviewProducts, loadProductOverview, ProductPage } from '../../utils/product-catalogue';
import { productThumbnail, usesRemoteOnlyPresentation } from '../../utils/product-media';
import '../../assets/styles/pages-public.css';

export default function Products() {
  const { t, language } = useI18n();
  const categories = [
    ['all', t('products.all')],
    ['toilet', t('products.smartToilet')],
    ['toilet-lid', t('products.toiletLid')],
    ['water', t('products.water')],
    ['drain', t('products.drain')],
  ] as const;
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') ?? 'all';
  const requestedSeries = searchParams.get('series') ?? 'all';
  const series = requestedSeries === '瑞景' ? '锐净' : requestedSeries;
  const waterSubcategory = searchParams.get('waterSubcategory') ?? 'all';
  const search = searchParams.get('search') ?? '';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const categoryLabel = (value: string) => {
    const labels: Record<string, string> = {
      toilet: t('products.smartToilet'),
      'toilet-lid': t('products.toiletLid'),
      'Toilet Lid': t('products.toiletLid'),
      water: t('products.water'),
      drain: t('products.drain'),
    };
    return language === 'zh-CN' || value === 'Toilet Lid' ? labels[value] ?? value : value;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', category === 'all' ? '50' : '12');
    if (category !== 'all') params.set('category', category);
    if (category === 'water' && series !== 'all') params.set('series', series);
    if (category === 'water' && waterSubcategory === 'filter-core') params.set('waterSubcategory', waterSubcategory);
    if (search) params.set('search', search);
    const request = category === 'all'
      ? loadProductOverview((overviewPage) => {
          const overviewParams = new URLSearchParams(params);
          overviewParams.set('page', String(overviewPage));
          return api.get<ProductPage>(`/api/products?${overviewParams.toString()}`);
        }).then((items) => ({ items, total: items.length, page: 1, pageSize: Math.max(1, items.length) }))
      : api.get<ProductPage>(`/api/products?${params.toString()}`);
    request
      .then((result) => { if (active) setData(result); })
      .catch(() => {
        if (!active) return;
        setData(null);
        setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, series, waterSubcategory, search, page, retryNonce]);

  const selectCategory = (nextCategory: string) => {
    const next = new URLSearchParams(searchParams);
    setPage(1);
    if (nextCategory === 'all') {
      next.delete('category');
    } else {
      next.set('category', nextCategory);
    }
    if (nextCategory !== 'water') {
      next.delete('series');
      next.delete('waterSubcategory');
    }
    setSearchParams(next, { replace: true });
  };

  const selectWaterFilter = (nextSeries: string, nextWaterSubcategory = 'all') => {
    const next = new URLSearchParams(searchParams);
    setPage(1);
    if (nextWaterSubcategory === 'filter-core') {
      next.delete('series');
      next.set('waterSubcategory', nextWaterSubcategory);
    } else if (nextSeries !== 'all') {
      next.set('series', nextSeries);
      next.delete('waterSubcategory');
    } else {
      next.delete('series');
      next.delete('waterSubcategory');
    }
    setSearchParams(next, { replace: true });
  };

  const renderProductCard = (product: ProductItem) => (
    <div className="card" key={product.id}>
      <Link to={`/products/${product.id}`} className={`card__img${usesRemoteOnlyPresentation(product) ? ' card__img--remote' : ''}`}>
        <img src={productThumbnail(product)} alt={usesRemoteOnlyPresentation(product) ? `${product.name} — ${t('detail.remoteControl')}` : product.name} loading="lazy" />
      </Link>
      <div className="card__body">
        <span className="card__cat">{categoryLabel(product.category)}</span>
        <h3 className="card__title">{product.name}</h3>
        {product.series && <span className="small muted">{product.series}</span>}
        {product.model && <span className="small muted">{t('common.model')} {product.model}</span>}
        <p className="card__desc">{product.description.slice(0, 110)}...</p>
        <div className="card__foot">
          <PriceDisplay price={product.price} prices={product.prices} rrp={product.rrp} priceNote={language === 'zh-CN' ? '联系 AURIUS 申请经销合作' : product.priceNote} stock={product.stock} />
          <Link to={`/products/${product.id}`} className="btn btn-outline btn-sm">{t('common.more')}</Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <section className="page-band">
        <div className="container">
          <h1 className="section-title">{t('products.title')}</h1>
          <p className="section-sub">{t('products.sub')}</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="toolbar">
            <div className="flex gap-1 wrap">
              {categories.map(([value, label]) => (
                <button key={value} className={`cat-chip ${category === value ? 'active' : ''}`} onClick={() => selectCategory(value)}>
                  {label}
                </button>
              ))}
            </div>
            <span className="spacer" />
            <input
              type="text"
              placeholder={t('common.search')}
              defaultValue={search}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const next = new URLSearchParams(searchParams);
                  const value = (event.target as HTMLInputElement).value.trim();
                  setPage(1);
                  if (value) next.set('search', value);
                  else next.delete('search');
                  setSearchParams(next, { replace: true });
                }
              }}
            />
          </div>

          {category === 'water' && (
            <div className="water-filter-bar" aria-label="Water filtration range">
              <button
                type="button"
                className={`water-filter-chip ${series === 'all' && waterSubcategory === 'all' ? 'active' : ''}`}
                onClick={() => selectWaterFilter('all')}
                aria-pressed={series === 'all' && waterSubcategory === 'all'}
              >
                全部净水
              </button>
              <button
                type="button"
                className={`water-filter-chip ${series === '锐净' ? 'active' : ''}`}
                onClick={() => selectWaterFilter('锐净')}
                aria-pressed={series === '锐净'}
              >
                锐净
              </button>
              <button
                type="button"
                className={`water-filter-chip ${series === '赛博' ? 'active' : ''}`}
                onClick={() => selectWaterFilter('赛博')}
                aria-pressed={series === '赛博'}
              >
                赛博
              </button>
              <button
                type="button"
                className={`water-filter-chip ${waterSubcategory === 'filter-core' ? 'active' : ''}`}
                onClick={() => selectWaterFilter('all', 'filter-core')}
                aria-pressed={waterSubcategory === 'filter-core'}
              >
                滤芯
              </button>
            </div>
          )}

          {loading ? (
            <div className="page-loading">{t('common.loading')}</div>
          ) : error ? (
            <Alert type="error">
              <strong>{t('products.loadFailed')}</strong>
              <p>{t('products.error')}</p>
              <button className="btn btn-outline btn-sm" onClick={() => setRetryNonce((current) => current + 1)}>{t('common.retry')}</button>
            </Alert>
          ) : (
            <>
              {data?.items.length === 0 ? (
                <p className="muted" role="status">{t('common.noProducts')}</p>
              ) : category === 'all' ? (
                <div className="product-overview">
                  {groupOverviewProducts(data?.items ?? []).map((group) => (
                    <section className="product-category-section" key={group.key} aria-labelledby={`products-group-${group.key}`}>
                      <h2 className="product-category-title" id={`products-group-${group.key}`}>{t(group.titleKey)}</h2>
                      <div className={`card-grid ${group.gridClass}`}>
                        {group.items.map(renderProductCard)}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <>
                  <div className={`card-grid${category === 'water' ? ' water-product-grid' : ''}`}>
                    {(data?.items ?? []).map(renderProductCard)}
                  </div>
                  {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

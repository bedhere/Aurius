import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ProductItem } from '../../api/types';
import { Alert, Pagination, PriceDisplay } from '../../components/ui';
import { useI18n } from '../../i18n/LanguageContext';
import '../../assets/styles/pages-public.css';

export default function Products() {
  const { t, language } = useI18n();
  const categories = [
    ['all', t('products.all')],
    ['toilet', t('products.smartToilet')],
    ['water', t('products.water')],
    ['drain', t('products.drain')],
  ] as const;
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') ?? 'all';
  const series = searchParams.get('series') ?? 'all';
  const waterSubcategory = searchParams.get('waterSubcategory') ?? 'all';
  const search = searchParams.get('search') ?? '';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProductItem[]; total: number; page: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const categoryLabel = (value: string) => {
    const labels: Record<string, string> = {
      toilet: t('products.smartToilet'),
      water: t('products.water'),
      drain: t('products.drain'),
    };
    return language === 'zh-CN' ? labels[value] ?? value : value;
  };

  useEffect(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '12');
    if (category !== 'all') params.set('category', category);
    if (category === 'water' && series !== 'all') params.set('series', series);
    if (category === 'water' && waterSubcategory === 'filter-core') params.set('waterSubcategory', waterSubcategory);
    if (search) params.set('search', search);
    api
      .get<{ items: ProductItem[]; total: number; page: number; pageSize: number }>(`/api/products?${params.toString()}`)
      .then(setData)
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => setLoading(false));
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
                className={`water-filter-chip ${series === '瑞景' ? 'active' : ''}`}
                onClick={() => selectWaterFilter('瑞景')}
                aria-pressed={series === '瑞景'}
              >
                瑞景
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
              <div className="card-grid">
                {(data?.items ?? []).map((product) => (
                  <div className="card" key={product.id}>
                    <Link to={`/products/${product.id}`} className="card__img">
                      <img src={product.images[0] ?? '/favicon.svg'} alt={product.name} loading="lazy" />
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
                ))}
              </div>
              {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
            </>
          )}
        </div>
      </section>
    </>
  );
}

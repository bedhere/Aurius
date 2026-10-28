import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { ProductItem, ProductVariant } from '../../api/types';
import { Alert, PageLoading, PriceDisplay } from '../../components/ui';
import ProductWarrantyBadge from '../../components/ProductWarrantyBadge';
import { productLabel } from '../../utils/product-label';
import InstallmentPaymentEntry from '../../components/InstallmentPaymentEntry';
import { useAuth } from '../../context/AuthContext';
import { ResourceLibrary } from '../../components/ResourceLibrary';
import { useI18n } from '../../i18n/LanguageContext';
import { productGallery, usesRemoteOnlyPresentation, usesWideFeaturePresentation } from '../../utils/product-media';
import '../../assets/styles/pages-public.css';

interface Specs {
  sizes?: string[];
  colors?: string[];
  features?: string[];
}

type SpecGroup = 'sizes' | 'colors' | 'features';

function normalizeSpecs(value: ProductItem['specs']): Specs {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const list = (key: SpecGroup): string[] | undefined => {
    const entry = raw[key];
    if (!Array.isArray(entry)) return undefined;
    return entry.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  };
  return {
    sizes: list('sizes'),
    colors: list('colors'),
    features: list('features'),
  };
}

const FLOOR_DRAIN_CODE = 'AUR-FD-01';
const FLOOR_DRAIN_FINISHES = [
  { key: 'brushedSteel', color: '#b7bcc0', shine: '#f3f5f4' },
  { key: 'gold', color: '#c7a13a', shine: '#f6dd82' },
  { key: 'roseGold', color: '#b87968', shine: '#efb8a5' },
  { key: 'gunmetal', color: '#3b4a4f', shine: '#73868a' },
  { key: 'matteBlack', color: '#1e2426', shine: '#566067' },
] as const;
type FloorDrainFinishKey = (typeof FLOOR_DRAIN_FINISHES)[number]['key'];

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const [product, setProduct] = useState<ProductItem | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<Partial<Record<SpecGroup, string | string[]>>>({});
  const [selectedDrainFinish, setSelectedDrainFinish] = useState<FloorDrainFinishKey>(FLOOR_DRAIN_FINISHES[0].key);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setSelectedVariant(null);
    setSelectedSpecs({});
    setSelectedDrainFinish(FLOOR_DRAIN_FINISHES[0].key);
    setActiveImage(0);
    setLoading(true);
    setLoadError(false);
    api.get<ProductItem>(`/api/products/${id}`)
      .then((data) => {
        if (mounted) setProduct(data);
      })
      .catch(() => {
        if (mounted) {
          setProduct(null);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const specs = useMemo(() => normalizeSpecs(product?.specs ?? null), [product?.specs]);
  const fitNote = useMemo(() => {
    if (!product) return '';
    const category = typeof product.category === 'string' ? product.category.toLowerCase() : '';
    const isDrain = product.productCode === FLOOR_DRAIN_CODE || category.includes('drain') || product.displayStyle === 'engineering';
    if (isDrain) return product.dimensionSpec ?? t('115 × 115 mm · Ø80 mm outlet · SUS304 · 1.2 mm material thickness');
    if (product.dimensionSpec) return product.dimensionSpec;
    return `${t('Available sizes:')} ${specs.sizes?.join(' / ') || t('Standard fit')}`;
  }, [product, specs.sizes, t]);

  if (loading) {
    return <PageLoading />;
  }

  if (loadError || !product) {
    return (
      <section className="section">
        <div className="container center">
          <Alert type="error">{loadError ? t('Product details could not be loaded. Please try again later.') : t('detail.notFound')}</Alert>
          <Link to="/products" className="btn btn-outline mt-2">{t('common.backProducts')}</Link>
        </div>
      </section>
    );
  }

  const inStock = product.stock > 0;
  const remoteOnly = usesRemoteOnlyPresentation(product);
  const wideFeature = usesWideFeaturePresentation(product);
  const dimensionImage = product.dimensionImage;
  const featureImage = product.featureImage;
  const isFloorDrain = !remoteOnly && (product.productCode === FLOOR_DRAIN_CODE
    || (typeof product.category === 'string' && product.category.toLowerCase().includes('drain'))
    || product.displayStyle === 'engineering');
  const gallery = productGallery(product);
  const safeGallery = gallery.length > 0 ? gallery : ['/favicon.svg'];
  const activeGallery = safeGallery[activeImage] ?? safeGallery[0];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const drainVariants = variants.filter(
    (variant) => typeof variant.attributes.finishKey === 'string',
  );
  const selectedDrainVariant = drainVariants.find(
    (variant) => variant.attributes.finishKey === selectedDrainFinish,
  );
  const selectedDrainImage = selectedDrainVariant?.attributes.image ?? safeGallery[0];
  const selectedFinishName = selectedDrainVariant?.attributes.colour ?? t(`drain.finish.${selectedDrainFinish}`);
  const guestCheckoutLink = `/guest-checkout?productId=${product.id}${selectedVariant?.id ? `&variantId=${selectedVariant.id}` : ''}`;
  const canRetailBuy = (!user || user.accountStatus !== 'ACTIVE') && (product.prices?.promo != null || product.prices?.retail != null || product.price?.level === 0);
  const allowCart = Boolean(user?.accountStatus === 'ACTIVE' && inStock && product.price != null);

  const selectedFitNote = isFloorDrain
    ? `${fitNote} · ${selectedFinishName}`
    : fitNote;

  const isSpecSelected = (group: SpecGroup, value: string): boolean => {
    const selected = selectedSpecs[group];
    return group === 'features' ? Array.isArray(selected) && selected.includes(value) : selected === value;
  };

  const selectSpec = (group: SpecGroup, value: string): void => {
    if (group === 'features') {
      const current = Array.isArray(selectedSpecs.features) ? selectedSpecs.features : [];
      setSelectedSpecs({
        ...selectedSpecs,
        features: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      });
      return;
    }

    const nextValue = selectedSpecs[group] === value ? undefined : value;
    const nextSpecs = { ...selectedSpecs, [group]: nextValue };
    setSelectedSpecs(nextSpecs);

    if (variants.length > 0) {
      const variant = variants.find((item) =>
        Object.entries(nextSpecs).every(([key, selected]) => {
          if (key === 'features' || !selected || Array.isArray(selected)) return true;
          const attribute = key === 'sizes' ? 'length' : 'colour';
          return item.attributes[attribute] === selected;
        }),
      );
      setSelectedVariant(variant ?? null);
    }
  };

  const addToCart = async () => {
    const variantToAdd = isFloorDrain ? selectedDrainVariant : selectedVariant;
    if (variants.length > 0 && !variantToAdd) {
      setMessage({ type: 'error', text: 'Select an available product option before adding this item to your cart.' });
      return;
    }

    setAdding(true);
    setMessage(null);
    try {
      await api.post('/api/cart', { productId: product.id, quantity: 1, variantId: variantToAdd?.id });
      setMessage({ type: 'success', text: 'Added to cart. View your cart to proceed to checkout.' });
    } catch (error) {
      setMessage({ type: 'error', text: (error as ApiError).message });
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="product-detail__header">
          <Link to="/products" className="small">{t('common.backProducts')}</Link>
          <Link to="/become-a-partner" className="product-detail__partner">{t('Become an AURIUS Partner')}</Link>
        </div>

        <div className="product-detail mt-2">
          <div>
            <div className={`product-detail__img${remoteOnly ? ' product-detail__img--remote' : ''}`}>
              {isFloorDrain ? (
                <div className="product-detail__stage">
                  <img src={selectedDrainImage} alt={`${product.name} - ${selectedFinishName}`} />
                </div>
              ) : (
                <>
                  <img id="product-main-image" src={activeGallery} alt={`${product.name} — ${t('Product image')} ${activeImage + 1}`} />
                  {safeGallery.length > 1 && (
                    <div className="product-detail__thumbs" role="group" aria-label={t('Product images')}>
                      {safeGallery.map((image, index) => (
                        <button key={image} type="button" className={index === activeImage ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`${t('View product image')} ${index + 1}`} aria-pressed={index === activeImage} aria-controls="product-main-image">
                          <img src={image} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {!isFloorDrain && product.displayStyle === 'carousel' && product.promotionNote && (
              <p className="product-detail__carousel-note">{product.promotionNote}</p>
            )}

            <div className="product-detail__dimension">
              <h3>{t('detail.dimensions')}</h3>
              <p>{selectedFitNote}</p>
              {specs.sizes?.length ? (
                <div className="dimension-grid">
                  {specs.sizes.map((size) => (
                    <span key={size} className={`dimension-pill ${isSpecSelected('sizes', size) ? 'active' : ''}`}>{size}</span>
                  ))}
                </div>
              ) : (
                <p className="muted small">{product.dimensionSpec ?? t('Please confirm measurements before installation.')}</p>
              )}
            </div>
          </div>

          <div>
            <span className="card__cat">{t(product.category)}</span>
            {product.series && <p className="product-detail__series">{product.series}</p>}
            <h1 className="product-detail__title">{productLabel(product).series}{productLabel(product).model && <span className="product-card__model"> | {productLabel(product).model}</span>}</h1>
            {product.model && <p className="muted small">{t('common.model')} {product.model} | SKU {product.sku}</p>}
            <p>{product.description}</p>
            {product.giftable && <p className="badge badge-green">{t('Gift eligible')}</p>}

            <div className="mb-2">
              <div className="product-detail__price-row">
                <PriceDisplay price={product.price} prices={product.prices} rrp={product.rrp} priceNote={product.priceNote} stock={product.stock} />
                <InstallmentPaymentEntry />
              </div>
              <div className="mt-1">
                {inStock ? <span className="badge badge-green">{t('common.inStock')} ({product.stock} {t('common.units')})</span> : <span className="badge badge-red">{t('common.outOfStock')}</span>}
              </div>
            </div>

            {!isFloorDrain && variants.length > 0 && (
              <div className="product-options mb-2">
                <h3>{t('detail.choose')}</h3>
                <div className="product-options__list" role="list">
                  {variants.map((variant) => {
                    const available = variant.stock === null || variant.stock > 0;
                    return (
                      <button
                        type="button"
                        key={variant.id}
                        className={`product-option ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                        onClick={() => available && setSelectedVariant(variant)}
                        disabled={!available}
                        aria-pressed={selectedVariant?.id === variant.id}
                      >
                        <span>{variant.name}</span>
                        <span className="product-option__meta">{available ? (variant.stock === null ? t('common.available') : `${variant.stock} ${t('common.available')}`) : t('common.unavailable')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {message && <Alert type={message.type}>{message.text}</Alert>}

            {allowCart ? (
              <button className="btn btn-primary btn-lg" onClick={addToCart} disabled={adding}>
                {adding ? t('detail.adding') : t('detail.add')}
              </button>
            ) : isFloorDrain ? (
              <Link to="/contact" className="btn btn-primary btn-lg">{t('Enquire About Custom Projects')}</Link>
            ) : canRetailBuy ? (
              <Link to={guestCheckoutLink} className="btn btn-primary btn-lg">{t('Buy Now')}</Link>
            ) : (
              <Link to="/contact" className="btn btn-outline btn-lg">{t('Contact AURIUS')}</Link>
            )}

            <ProductWarrantyBadge category={product.category} />

            {(dimensionImage || (!wideFeature && featureImage)) && (
              <div className="product-detail__diagrams">
                {([
                  ['dimension', dimensionImage, t('detail.dimensionImage')],
                  ['feature', wideFeature ? null : featureImage, t('detail.featureImage')],
                ] as const).map(([key, image, label]) => image && (
                  <section className={`product-detail__diagram product-detail__diagram--${key}`} key={key} aria-labelledby={`product-diagram-${key}`}>
                    <h2 id={`product-diagram-${key}`}>{label}</h2>
                    <a href={image} target="_blank" rel="noreferrer" aria-label={`${label} — ${t('detail.viewFullImage')}`}>
                      <img src={image} alt={`${product.name} — ${label}`} loading="lazy" />
                    </a>
                    <span className="small muted">{t('detail.viewFullImage')}</span>
                  </section>
                ))}
              </div>
            )}

            {isFloorDrain && (
              <section className="drain-configurator mt-3" aria-labelledby="drain-configurator-title">
                <div className="drain-configurator__heading">
                  <h2 id="drain-configurator-title">{t('drain.config.title')}</h2>
                  <p>{t('drain.config.copy')}</p>
                </div>

                <div className="drain-configurator__controls">
                  <div>
                    <h3>{t('drain.finish')}</h3>
                    <div className="drain-finish-grid" role="list">
                      {drainVariants.map((variant) => {
                        const finishKey = variant.attributes.finishKey as FloorDrainFinishKey;
                        const finish = FLOOR_DRAIN_FINISHES.find((item) => item.key === finishKey) ?? FLOOR_DRAIN_FINISHES[0];
                        const name = variant.attributes.colour ?? t(`drain.finish.${finishKey}`);
                        const selected = selectedDrainFinish === finishKey;
                        const available = variant.stock === null || variant.stock > 0;
                        return (
                          <button
                            type="button"
                            className={`drain-finish-option ${selected ? 'active' : ''}`}
                            key={variant.id}
                            onClick={() => available && setSelectedDrainFinish(finishKey)}
                            aria-label={name}
                            aria-pressed={selected}
                            disabled={!available}
                          >
                            <span className="drain-finish-option__swatch" style={{ background: `linear-gradient(135deg, ${finish.shine}, ${finish.color})` }} aria-hidden="true" />
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="drain-preview" aria-live="polite">
                  <div className="drain-preview__stage">
                    <img src={selectedDrainImage} alt={`${product.name} - ${selectedFinishName}`} />
                  </div>
                  <p className="drain-preview__label">{t('drain.preview')}: 115 × 115 mm · {selectedFinishName}</p>
                </div>
              </section>
            )}

            {(!isFloorDrain && variants.length === 0 && (specs.sizes || specs.colors || specs.features)) && (
              <div className="mt-3">
                {specs.sizes && (
                  <div className="mb-2">
                    <h3>{t('detail.sizes')}</h3>
                    <div className="spec-chips">
                      {specs.sizes.map((size) => (
                        <button type="button" className={`spec-chip ${isSpecSelected('sizes', size) ? 'active' : ''}`} key={size} onClick={() => selectSpec('sizes', size)} aria-pressed={isSpecSelected('sizes', size)}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {specs.colors && (
                  <div className="mb-2">
                    <h3>{t('detail.colours')}</h3>
                    <div className="spec-chips">
                      {specs.colors.map((color) => (
                        <button type="button" className={`spec-chip ${isSpecSelected('colors', color) ? 'active' : ''}`} key={color} onClick={() => selectSpec('colors', color)} aria-pressed={isSpecSelected('colors', color)}>
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {specs.features && (
                  <div>
                    <h3>{t('detail.features')}</h3>
                    <div className="spec-chips">
                      {specs.features.map((feature) => (
                        <button type="button" className={`spec-chip brand-chip ${isSpecSelected('features', feature) ? 'active' : ''}`} key={feature} onClick={() => selectSpec('features', feature)} aria-pressed={isSpecSelected('features', feature)}>
                          {feature}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {wideFeature && featureImage && (
          <section className="product-detail__diagram product-detail__diagram--wide" aria-labelledby="product-feature-strip-title">
            <h2 id="product-feature-strip-title">{t('detail.featureImage')}</h2>
            <a href={featureImage} target="_blank" rel="noreferrer" aria-label={`${t('detail.featureImage')} — ${t('detail.viewFullImage')}`}>
              <img src={featureImage} alt={`${product.name} — ${t('detail.featureImage')}`} loading="lazy" />
            </a>
            <span className="small muted">{t('detail.viewFullImage')}</span>
          </section>
      )}
      <div className="container support-resources-section"><h2 className="section-title">{t('Product Resources')}</h2><ResourceLibrary productId={product.id} /></div>
    </section>
  );
}

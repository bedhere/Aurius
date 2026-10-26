import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { DealerLocation } from '../../api/types';
import { Alert } from '../../components/ui';
import { useI18n } from '../../i18n/LanguageContext';
import { dealerMapUrl, groupDealerLocations } from '../../utils/dealer-locations';
import { stateLabel } from '../../utils/format';
import '../../assets/styles/pages-public.css';

export default function Stockists() {
  const { t, language } = useI18n();
  const [dealers, setDealers] = useState<DealerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const { state: stateParam } = useParams<{ state: string }>();
  const selectedState = stateParam?.toLowerCase() === 'other' ? 'other' : stateParam?.toUpperCase();
  const groups = groupDealerLocations(dealers);
  const selectedGroup = groups.find((group) => group.state === selectedState);
  const stateTitle = (state: string) => {
    const key = `stockists.state.${state}`;
    return t(key) === key ? stateLabel(state) : t(key);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    api.get<DealerLocation[]>('/api/dealers')
      .then((locations) => { if (active) setDealers(locations); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryNonce]);

  return (
    <>
      <section className="page-band page-band--dense">
        <div className="container">
          <h1 className="section-title">{selectedGroup ? (language === 'zh-CN' ? `${stateTitle(selectedGroup.state)}授权网点` : `${stateTitle(selectedGroup.state).replace(' (Canberra)', '')} Stockists`) : t('stockists.title')}</h1>
          <p className="section-sub">{selectedGroup && !selectedGroup.dealers.length ? (language === 'zh-CN' ? `AURIUS 正在${stateTitle(selectedGroup.state)}逐步建立授权销售网络。如需了解产品供应情况或当地销售服务，请联系 AURIUS。` : `Our authorised stockist network in ${stateTitle(selectedGroup.state).replace(' (Canberra)', '')} is currently being developed. For product availability and local enquiries, please contact AURIUS.`) : t(selectedState ? 'stockists.stateSub' : 'stockists.sub')}</p>
        </div>
      </section>
      <section className="section stockists-recruitment" aria-label={t('stockists.regions')}>
        <div className="container">
          {selectedState && <Link className="stockists-back" to="/stockists">← {t('stockists.backStates')}</Link>}
          {loading ? <div className="page-loading">{t('common.loading')}</div> : error ? (
            <Alert type="error">
              <p>{t('stockists.loadFailed')}</p>
              <button className="btn btn-outline btn-sm" onClick={() => setRetryNonce((value) => value + 1)}>{t('common.retry')}</button>
            </Alert>
          ) : selectedState ? selectedGroup ? (
            <StateDealerView key={selectedGroup.state} state={selectedGroup.state} dealers={selectedGroup.dealers} title={stateTitle(selectedGroup.state)} />
          ) : <p role="status">{t('stockists.regionNotFound')}</p> : (
            <div className="stockists-state-grid">
              {groups.map((group) => <StatePartnerCard key={group.state} state={group.state} dealers={group.dealers} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function StatePartnerCard({ state, dealers }: { state: string; dealers: DealerLocation[] }) {
  const { t } = useI18n();
  const titleKey = `stockists.state.${state}`;
  const translatedTitle = t(titleKey);
  const title = translatedTitle === titleKey ? stateLabel(state) : translatedTitle;

  return (
    <article className="stockist-state-card" aria-labelledby={`stockist-state-${state}`}>
      <header className="stockist-state-card__header">
        {state !== 'other' && <span className="stockist-state-card__code">{state}</span>}
        <h2 id={`stockist-state-${state}`}>{title}</h2>
      </header>
      {dealers.length > 0 ? (
        <>
          <span className="stockist-state-card__status">{t('stockists.available')} · {dealers.length}</span>
          <h3>{t('stockists.localNetwork')}</h3>
          <p>{t('stockists.viewStateIntro')}</p>
        </>
      ) : (
        <>
          <span className="stockist-state-card__status">{t('stockists.recruiting')}</span>
          <h3>{t('stockists.vacancy')}</h3>
          <p>{t('stockists.invitation')}</p>
        </>
      )}
      <Link to={`/stockists/${state.toLowerCase()}`} className="btn btn-outline btn-sm" aria-label={`${t('stockists.viewState')} — ${title}`}>{t('stockists.viewState')}</Link>
    </article>
  );
}

function StateDealerView({ state, dealers, title }: { state: string; dealers: DealerLocation[]; title: string }) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const dealer = dealers.find((entry) => entry.id === selectedId) ?? dealers[0];

  if (!dealer) return (
    <div className="stockist-state-card stockists-state-vacancy">
      <span className="stockist-state-card__status">{t('stockists.recruiting')}</span>
      <h2>{t('stockists.vacancy')}</h2>
      <p>{t("For product availability and local enquiries, please contact AURIUS.")}</p>
      <Link to="/contact" className="btn btn-outline btn-sm" aria-label={`${t('Contact AURIUS')} — ${title}`}>{t('Contact AURIUS')}</Link>
    </div>
  );

  return (
    <div className="stockists-state-layout">
      <nav className="stockists-dealer-list" aria-label={`${title} — ${t('stockists.selectDealer')}`}>
        <h2>{t('stockists.selectDealer')} · {dealers.length}</h2>
        <div className="stockists-dealer-list__items">
          {dealers.map((entry) => (
            <button className={`stockist-dealer-choice${entry.id === dealer.id ? ' active' : ''}`} key={entry.id} type="button" aria-pressed={entry.id === dealer.id} aria-controls={`stockist-details-${state}`} onClick={() => setSelectedId(entry.id)}>
              <strong>{entry.name}</strong>
              <span>{[entry.address, entry.city].filter(Boolean).join(', ')}</span>
            </button>
          ))}
        </div>
      </nav>
      <section className="stockists-selected-dealer" id={`stockist-details-${state}`} aria-label={dealer.name}>
        <DealerDetails key={dealer.id} dealer={dealer} />
      </section>
    </div>
  );
}

function DealerDetails({ dealer }: { dealer: DealerLocation }) {
  const { t } = useI18n();
  const [photoFailed, setPhotoFailed] = useState(false);
  const mapSrc = dealerMapUrl(dealer);
  return (
    <div className="stockist-dealer-details">
      <div className="stockist-dealer-media">
        <div className="stockist-dealer-photo">
          {dealer.photos[0] && !photoFailed ? (
            <img src={dealer.photos[0]} alt={dealer.name} loading="lazy" onError={() => setPhotoFailed(true)} />
          ) : <span>{t('stockists.noPhoto')}</span>}
        </div>
        {dealer.photos.length > 1 && (
          <div className="stockist-dealer-photos">
            {dealer.photos.slice(1).map((photo) => <img key={photo} src={photo} alt={dealer.name} loading="lazy" />)}
          </div>
        )}
      </div>
      <div className="stockist-dealer-info">
        <h2>{dealer.name}</h2>
        <address className="stockist-dealer-contact">
          {dealer.phone && <a href={`tel:${dealer.phone.replace(/[^\d+]/g, '')}`}>{dealer.phone}</a>}
          <span>{[dealer.address, dealer.city, dealer.state].filter(Boolean).join(', ')}</span>
        </address>
        {dealer.serviceArea && <p><strong>{t('Service area')}: </strong>{dealer.serviceArea}</p>}
        {dealer.productCategories && <p><strong>{t('Product categories')}: </strong>{dealer.productCategories}</p>}
        {dealer.website && <p><a href={dealer.website} target="_blank" rel="noopener noreferrer">{t('Company website')}</a></p>}
        {dealer.note && <p>{dealer.note}</p>}
        {mapSrc ? (
          <iframe className="stockist-dealer-map" title={`${dealer.name} — ${t('stockists.map')}`} src={mapSrc} loading="lazy" referrerPolicy="no-referrer" />
        ) : <p>{t('stockists.noMap')}</p>}
      </div>
    </div>
  );
}

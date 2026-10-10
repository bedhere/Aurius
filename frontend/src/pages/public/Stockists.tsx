import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DealerLocation } from '../../api/types';
import { stateLabel } from '../../utils/format';
import '../../assets/styles/pages-public.css';

function mapUrl(dealer: DealerLocation): string {
  const latitudeSpan = 0.025;
  const longitudeSpan = 0.035;
  const south = Math.max(-90, dealer.latitude - latitudeSpan);
  const north = Math.min(90, dealer.latitude + latitudeSpan);
  const west = Math.max(-180, dealer.longitude - longitudeSpan);
  const east = Math.min(180, dealer.longitude + longitudeSpan);
  const params = new URLSearchParams({
    bbox: `${west},${south},${east},${north}`,
    layer: 'mapnik',
    marker: `${dealer.latitude},${dealer.longitude}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

export default function Stockists() {
  const [dealers, setDealers] = useState<DealerLocation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    api.get<DealerLocation[]>('/api/dealers').then((data) => {
      setDealers(data);
      setActiveId(data[0]?.id ?? null);
    }).catch(() => setDealers([]));
  }, []);

  const activeDealer = useMemo(() => dealers.find((dealer) => dealer.id === activeId) ?? dealers[0] ?? null, [dealers, activeId]);
  const mapSrc = activeDealer ? mapUrl(activeDealer) : null;

  return (
    <section className="page-band page-band--dense">
      <div className="container">
        <h1 className="section-title">经销网点</h1>
        <p className="section-sub">查看门店照片、电话、地址与地图位置，按门店切换即可定位。</p>

        <div className="stockists-layout">
          <div className="stockists-list">
            {dealers.map((dealer) => (
              <button
                key={dealer.id}
                type="button"
                className={`stockist-card ${dealer.id === activeDealer?.id ? 'active' : ''}`}
                onClick={() => setActiveId(dealer.id)}
              >
                <span className="stockist-card__eyebrow">{dealer.state ? stateLabel(dealer.state) : 'Dealer'}</span>
                <strong>{dealer.name}</strong>
                {dealer.phone && <span>{dealer.phone}</span>}
                <span>{dealer.address}</span>
              </button>
            ))}
          </div>

          <div className="stockists-detail">
            {activeDealer ? (
              <>
                <div className="stockists-detail__hero">
                  {activeDealer.photos[0] ? <img src={activeDealer.photos[0]} alt={activeDealer.name} /> : <div className="stockists-detail__placeholder">No photo</div>}
                </div>
                <div className="stockists-detail__info">
                  <h2>{activeDealer.name}</h2>
                  {activeDealer.phone && <p>{activeDealer.phone}</p>}
                  <p>{activeDealer.address}</p>
                  {activeDealer.note && <p>{activeDealer.note}</p>}
                  {activeDealer.photos.length > 1 && (
                    <div className="stockists-photo-strip">
                      {activeDealer.photos.slice(1).map((photo) => <img key={photo} src={photo} alt={activeDealer.name} />)}
                    </div>
                  )}
                  <Link to="/trade" className="btn btn-primary btn-sm">成为合作伙伴</Link>
                </div>
                <div className="stockists-detail__map">
                  {mapSrc ? (
                    <iframe
                      title={`${activeDealer.name} map`}
                      src={mapSrc}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="stockists-detail__placeholder">No dealer locations configured.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="stockists-detail__placeholder">No dealer locations configured.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

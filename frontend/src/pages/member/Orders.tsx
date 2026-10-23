import { useI18n } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { OrderListItem } from '../../api/types';
import { Pagination, Spinner } from '../../components/ui';
import { fmtDate, fmtMoney, statusBadgeClass } from '../../utils/format';
import '../../assets/styles/pages-member.css';

const STATUSES = ['All', 'PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default function Orders() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'All';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: OrderListItem[]; total: number; page: number; pageSize: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '10' });
    if (status !== 'All') params.set('status', status);
    api.get(`/api/orders?${params.toString()}`).then(setData).catch(() => setData({ items: [], total: 0, page: 1, pageSize: 10 }));
  }, [status, page]);

  const selectStatus = (s: string) => {
    setPage(1);
    if (s === 'All') searchParams.delete('status');
    else searchParams.set('status', s);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <>
      <h2>{t("My Orders")}</h2>
      <div className="toolbar">
        <div className="flex gap-1 wrap">
          {STATUSES.map((s) => (
            <button key={s} className={`cat-chip ${status === s ? 'active' : ''}`} onClick={() => selectStatus(s)}>
              {t(s)}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <p className="muted">{t("No orders found.")}</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("Order Number")}</th>
                  <th>{t("Date")}</th>
                  <th>{t("Items")}</th>
                  <th>{t("Total")}</th>
                  <th>{t("Payment")}</th>
                  <th>{t("Shipment")}</th>
                  <th>{t("Status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td>{fmtDate(o.createdAt)}</td>
                    <td className="small">{o.productSummary}</td>
                    <td>{fmtMoney(o.total)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.paymentStatus)}`}>{t(o.paymentStatus)}</span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.shipmentStatus)}`}>{t(o.shipmentStatus)}</span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>{t(o.status)}</span>
                    </td>
                    <td>
                      <Link to={`/member/orders/${o.id}`} className="btn btn-outline btn-sm">
                        {t("View")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}

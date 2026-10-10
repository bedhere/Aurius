import { useEffect, useState } from 'react';
import { api, getAccessToken } from '../../api/client';
import { DownloadItem } from '../../api/types';
import { Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';
import '../../assets/styles/pages-member.css';

const CATEGORY_LABELS: Record<string, string> = {
  WATERMARK_CERTIFICATION: 'WaterMark Certification',
  PRODUCT_CATALOGUE: 'Product Catalogue',
  INSTALLATION_DRAWINGS: 'Installation Drawings',
  INSTALLATION_GUIDE: 'Installation Guide',
  DEALER_CONTRACT_TEMPLATE: 'Dealer Contract Template',
  TECHNICAL_DOCUMENTS: 'Technical Documents',
  OTHER: 'Other',
};

export default function Downloads() {
  const [files, setFiles] = useState<DownloadItem[] | null>(null);

  useEffect(() => {
    api.get<DownloadItem[]>('/api/downloads').then(setFiles).catch(() => setFiles([]));
  }, []);

  const download = async (file: DownloadItem) => {
    const res = await fetch(`/api/downloads/${file.id}/file`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (files === null) return <Spinner />;

  const grouped: Record<string, DownloadItem[]> = {};
  for (const f of files) {
    const key = CATEGORY_LABELS[f.category] ?? 'Other';
    (grouped[key] ??= []).push(f);
  }

  return (
    <>
      <h2>Downloads</h2>
      <p className="muted small">Internal documents — for authorised AURIUS partners only.</p>
      {Object.keys(grouped).length === 0 ? (
        <p className="muted">No documents available for your membership level.</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div className="panel" key={cat}>
            <h3>{cat}</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Size</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div>{f.title}</div>
                        {f.description && <div className="small muted">{f.description}</div>}
                      </td>
                      <td>{(f.size / 1024).toFixed(0)} KB</td>
                      <td>{fmtDate(f.createdAt)}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => download(f)}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}

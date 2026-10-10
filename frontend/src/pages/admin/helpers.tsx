import { ReactNode } from 'react';
import { ApiError, getAccessToken } from '../../api/client';
import { statusBadgeClass } from '../../utils/format';

export function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Request failed';
}

// Fetch a protected endpoint and trigger a browser download of the blob.
export async function downloadBlob(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`导出失败 (HTTP ${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv">
      <b>{label}</b>
      <span>{children}</span>
    </div>
  );
}

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="badge badge-gray">-</span>;
  return <span className={`badge ${statusBadgeClass(value)}`}>{value}</span>;
}

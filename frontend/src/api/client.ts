// Unified API client. Keeps the access token in memory (never localStorage)
// and silently refreshes via the httpOnly refresh cookie on 401.
import { getPreferredLanguage } from '../i18n/LanguageContext';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: { field?: string; message: string }[];
}

export class ApiError extends Error {
  status: number;
  errors: { field?: string; message: string }[];
  constructor(status: number, message: string, errors: { field?: string; message: string }[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setSessionExpiredHandler(fn: () => void): void {
  onSessionExpired = fn;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Accept-Language': getPreferredLanguage() },
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const json = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
        accessToken = json.data.accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {};
  headers['Accept-Language'] = getPreferredLanguage();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isForm) {
      payload = body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  let res = await fetch(path, {
    method,
    headers,
    body: payload,
    credentials: 'include',
  });

  // Expired or newly restored sessions both refresh through the httpOnly cookie.
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const retryHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Accept-Language': getPreferredLanguage(),
      };
      if (body !== undefined && !isForm) retryHeaders['Content-Type'] = 'application/json';
      res = await fetch(path, {
        method,
        headers: retryHeaders,
        body: payload,
        credentials: 'include',
      });
    } else if (onSessionExpired) {
      onSessionExpired();
    }
  }

  const isDownload = path.includes('/file');
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    if (res.ok) return undefined as T;
  }
  if (isDownload && res.ok) return json as unknown as T;
  if (!res.ok) {
    throw new ApiError(res.status, json?.message ?? `Request failed (HTTP ${res.status})`, json?.errors ?? []);
  }
  return json!.data;
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
  postForm: <T = any>(path: string, form: FormData) => request<T>('POST', path, form, true),
};

export function downloadUrl(path: string): string {
  return `${path}`;
}

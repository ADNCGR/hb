import { ApiError } from './errors';
import type { ApiErrorBody } from './types';

// mock = serveur simulé dans le navigateur, http = API NestJS
export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';

const TOKEN_KEY = 'fract.token';

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(t: string | null) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {}
  },
};

export type AuthEvent = 'expired' | 'suspended';
const listeners = new Set<(e: AuthEvent) => void>();
export const onAuthEvent = (fn: (e: AuthEvent) => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const emit = (e: AuthEvent) => listeners.forEach((fn) => fn(e));

export interface RequestOptions {
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  auth?: boolean;
}

function cleanQuery(q: RequestOptions['query']) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(q ?? {})) if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  return out;
}

function raise(status: number, body: unknown, auth: boolean): never {
  const b = (body ?? {}) as Partial<ApiErrorBody>;
  const e = new ApiError(status, b.code ?? 'ERREUR', b.message ?? 'Le serveur a répondu par une erreur.', b.details);
  if (auth && status === 401) { tokenStore.set(null); emit('expired'); }
  if (status === 423) emit('suspended');
  throw e;
}

const latency = () => new Promise((r) => setTimeout(r, 180 + Math.random() * 320));

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const query = cleanQuery(opts.query);
  const auth = opts.auth !== false;
  const token = tokenStore.get();

  if (API_MODE === 'mock') {
    const { handle } = await import('./mock/server');
    await latency();
    const body = opts.body instanceof FormData ? opts.body : opts.body === undefined ? undefined : JSON.parse(JSON.stringify(opts.body));
    const res = handle({ method, path, query, body, token });
    if (res.status >= 400) raise(res.status, res.body, auth);
    return (res.body === null || res.body === undefined ? res.body : JSON.parse(JSON.stringify(res.body))) as T;
  }

  const qs = new URLSearchParams(query).toString();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers['Content-Type'] = 'application/json'; }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`, { method, headers, body });
  } catch {
    throw new ApiError(0, 'RESEAU', 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.');
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) raise(res.status, json, auth);
  return json as T;
}

export async function requestFile(path: string): Promise<{ blob: Blob; nom: string }> {
  const token = tokenStore.get();
  if (API_MODE === 'mock') {
    const { handleFile } = await import('./mock/server');
    await latency();
    const res = handleFile(path, token);
    if (res.status >= 400) raise(res.status, res.body, true);
    return { blob: res.blob!, nom: res.nom! };
  }
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) raise(res.status, await res.json().catch(() => null), true);
  const cd = res.headers.get('Content-Disposition') ?? '';
  const nom = decodeURIComponent(cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1] ?? 'document');
  return { blob: await res.blob(), nom };
}

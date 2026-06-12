declare global {
  interface Window {
    businessOS?: { apiBaseUrl?: string };
  }
}

function baseUrl(): string {
  if (typeof window !== 'undefined' && window.businessOS?.apiBaseUrl) {
    return window.businessOS.apiBaseUrl;
  }
  return 'http://localhost:4000';
}

export function apiUrl(path: string): string {
  return baseUrl() + path;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: unknown = undefined;
    try {
      detail = await res.json();
    } catch {
      /* ignore */
    }
    const message =
      (detail && typeof detail === 'object' && 'error' in detail && (detail as { error?: string }).error) ||
      `${res.status} ${res.statusText}`;
    throw new Error(message as string);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(apiUrl(path)));
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(apiUrl(path), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function apiDelete(path: string): Promise<void> {
  await handle<void>(await fetch(apiUrl(path), { method: 'DELETE' }));
}

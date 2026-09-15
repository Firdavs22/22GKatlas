import axios from 'axios';
import { API_URL } from './network';

const baseURL = `${API_URL.replace(/\/+$/, '')}/api`;
const transport = axios.create({ baseURL, withCredentials: true });
export const api = axios.create({ baseURL, withCredentials: true });
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let refreshRequest: Promise<void> | null = null;

export function removeLegacyCredentials() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  document.cookie = 'token=; path=/; SameSite=Lax; Max-Age=0';
}

export function storeAuthData(data: { user: object }) {
  removeLegacyCredentials();
  localStorage.setItem('user', JSON.stringify(data.user));
}

export function clearAuthData() {
  removeLegacyCredentials();
  if (typeof window !== 'undefined') localStorage.removeItem('user');
  csrfToken = null;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = transport.get('/auth/csrf').then(({ data }) => {
      csrfToken = data.csrfToken;
      if (!csrfToken) throw new Error('Не удалось подготовить защищённый запрос');
      return csrfToken;
    }).finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

export async function refreshSession(): Promise<void> {
  if (!refreshRequest) {
    const renew = async () => {
      const send = async () => transport.post('/auth/refresh', {}, {
        headers: { 'X-XSRF-TOKEN': await getCsrfToken() },
      });
      try { storeAuthData((await send()).data); }
      catch (error) {
        if (!axios.isAxiosError(error) || error.response?.data?.code !== 'CSRF_INVALID') throw error;
        csrfToken = null;
        storeAuthData((await send()).data);
      }
    };
    // Serialize refresh across browser tabs when Web Locks are available.
    const run = async (): Promise<void> => {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request('globoatlas-session-refresh', async () => {
          try { storeAuthData({ user: (await transport.get('/me')).data }); return; }
          catch (error) { if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error; }
          await renew();
        });
      } else {
        await renew();
      }
    };
    refreshRequest = run().finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

api.interceptors.request.use(async config => {
  removeLegacyCredentials();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((config.method || 'get').toUpperCase())) {
    config.headers['X-XSRF-TOKEN'] = await getCsrfToken();
  }
  return config;
});

api.interceptors.response.use(response => response, async error => {
  const request = error.config;
  if (!request || typeof window === 'undefined') return Promise.reject(error);
  if (error.response?.data?.code === 'CSRF_INVALID' && !request._csrfRetry) {
    request._csrfRetry = true;
    csrfToken = null;
    return api(request);
  }
  if (error.response?.status === 401 && !request._retry &&
      !request.url?.startsWith('/auth/') && request.url !== '/auth/login') {
    request._retry = true;
    try {
      await refreshSession();
      return api(request);
    } catch (refreshError) {
      clearAuthData();
      if (!['/login', '/invite', '/forgot', '/reset', '/privacy'].some(path => window.location.pathname.startsWith(path))) {
        window.location.assign('/login');
      }
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});

export default api;

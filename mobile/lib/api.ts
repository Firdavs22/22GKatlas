import axios from 'axios';
import Constants from 'expo-constants';
import { getToken, setToken, getRefreshToken, setRefreshToken, clearAuth } from './auth';
import { router } from 'expo-router';

function extractHost(hostUri?: string | null) {
  if (!hostUri) return null;
  const withoutScheme = hostUri.replace(/^[a-z]+:\/\//i, '');
  return withoutScheme.split('/')[0].split(':')[0] || null;
}

function getDevApiUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoConfig?.extra?.apiHost ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;
  const host = extractHost(hostUri);
  return host ? `http://${host}:3001` : 'http://localhost:3001';
}

// TODO: Change this to your VPS IP/domain in production
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  (__DEV__ ? getDevApiUrl() : 'https://your-domain.ru');

if (__DEV__) {
  console.log('[API] base URL:', `${API_URL}/api`, {
    expoHostUri: Constants.expoConfig?.hostUri,
    expoGoDebuggerHost: (Constants as any).expoGoConfig?.debuggerHost,
    manifestDebuggerHost: (Constants as any).manifest?.debuggerHost,
    envOverride: process.env.EXPO_PUBLIC_API_URL,
  });
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

// Track refresh state
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
};

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (__DEV__) {
    console.log('[API] request', {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL || ''}${config.url || ''}`,
      hasToken: Boolean(token),
    });
  }
  return config;
});

// Handle 401 → refresh token automatically
api.interceptors.response.use(
  (res) => {
    if (__DEV__) {
      console.log('[API] response', {
        status: res.status,
        url: `${res.config.baseURL || ''}${res.config.url || ''}`,
      });
    }
    return res;
  },
  async (err) => {
    const originalRequest = err.config;
    if (__DEV__) {
      console.log('[API] error', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        url: `${originalRequest?.baseURL || ''}${originalRequest?.url || ''}`,
        data: err.response?.data,
      });
    }
    if (!originalRequest) return Promise.reject(err);

    if (err.response?.status === 401 && !originalRequest._retry) {
      // Don't refresh on auth endpoints
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        await clearAuth();
        router.replace('/login');
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await clearAuth();
        router.replace('/login');
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        await setToken(data.token);
        await setRefreshToken(data.refreshToken);

        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await clearAuth();
        router.replace('/login');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);

export default api;

// Helper to get the full file URL with auth token for images/videos
export async function getAuthMediaUrl(path: string): Promise<string> {
  if (!path) return '';
  const token = await getToken();
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  return `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
}

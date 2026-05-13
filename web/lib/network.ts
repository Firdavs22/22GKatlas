function getBrowserBackendUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';

  const { protocol, hostname, port, origin } = window.location;
  if (port === '8080' || port === '8443') return origin;

  return `${protocol}//${hostname}:3001`;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || getBrowserBackendUrl();
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || getBrowserBackendUrl();

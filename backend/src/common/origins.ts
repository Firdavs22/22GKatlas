export function allowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000', 'http://localhost:8080',
    'http://127.0.0.1:3000', 'http://127.0.0.1:8080',
  ];
  if (process.env.PUBLIC_APP_URL) configured.push(process.env.PUBLIC_APP_URL);
  return [...new Set(configured.map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean))];
}

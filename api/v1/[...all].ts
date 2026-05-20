import app, { ensureAppReady } from '../../backend/src/app';

export default async function handler(req: any, res: any) {
  const rawSegments = req.query?.all;
  const segments = Array.isArray(rawSegments)
    ? rawSegments
    : rawSegments
      ? [rawSegments]
      : [];

  if (segments.length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'all') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else if (value != null) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    req.url = `/api/v1/${segments.join('/')}${queryString ? `?${queryString}` : ''}`;
  } else if (typeof req.url === 'string' && !req.url.startsWith('/api/')) {
    const normalized = req.url.startsWith('/') ? req.url : `/${req.url}`;
    req.url = `/api${normalized}`;
  }
  await ensureAppReady();
  return app(req, res);
}

import app, { ensureAppReady } from '../../backend/src/app';

export default async function handler(req: any, res: any) {
  if (typeof req.url === 'string' && !req.url.startsWith('/api/')) {
    const normalized = req.url.startsWith('/') ? req.url : `/${req.url}`;
    req.url = `/api${normalized}`;
  }
  await ensureAppReady();
  return app(req, res);
}

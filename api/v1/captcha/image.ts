import app, { ensureAppReady } from '../../../backend/src/app';

export default async function handler(req: any, res: any) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, String(item));
      }
    } else if (value != null) {
      query.append(key, String(value));
    }
  }

  req.url = `/api/v1/captcha/image${query.toString() ? `?${query.toString()}` : ''}`;
  await ensureAppReady();
  return app(req, res);
}

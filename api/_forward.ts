import app, { ensureAppReady } from '../backend/src/app';

function buildQueryString(query: Record<string, unknown>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (key === 'all' || value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
    } else {
      search.append(key, String(value));
    }
  }

  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function forwardToExpress(req: any, res: any, path: string, includeQuery = false) {
  req.url = `${path}${includeQuery ? buildQueryString(req.query || {}) : ''}`;
  await ensureAppReady();
  return app(req, res);
}

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

export async function forwardCatchAll(
  req: any,
  res: any,
  basePath: string,
  includeQuery = true,
) {
  const rawSegments = req.query?.all;
  const segments = Array.isArray(rawSegments)
    ? rawSegments
    : rawSegments
      ? [rawSegments]
      : [];

  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const suffix = segments.length > 0 ? `/${segments.join('/')}` : '';
  return forwardToExpress(req, res, `${normalizedBase}${suffix}`, includeQuery);
}

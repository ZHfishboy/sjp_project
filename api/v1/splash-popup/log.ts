import app, { ensureAppReady } from '../../../backend/src/app';

export default async function handler(req: any, res: any) {
  req.url = '/api/v1/splash-popup/log';
  await ensureAppReady();
  return app(req, res);
}

import app, { ensureAppReady } from '../backend/src/app';

export default async function handler(req: any, res: any) {
  await ensureAppReady();
  return app(req, res);
}

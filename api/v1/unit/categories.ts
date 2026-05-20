import { forwardToExpress } from '../../_forward';

export default async function handler(req: any, res: any) {
  return forwardToExpress(req, res, '/api/v1/unit/categories');
}

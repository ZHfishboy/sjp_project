import { forwardCatchAll } from '../../_forward';

export default async function handler(req: any, res: any) {
  return forwardCatchAll(req, res, '/api/v1/invite');
}

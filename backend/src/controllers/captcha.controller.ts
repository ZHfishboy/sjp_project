import { Request, Response } from 'express';
import { success, fail } from '../utils/response';
import { generateCaptcha, verifyCaptcha, CaptchaType } from '../services/captcha.service';

export async function getCaptcha(req: Request, res: Response): Promise<void> {
  const type = (req.query.type as CaptchaType) || 'image';

  try {
    const result = await generateCaptcha(type);
    return success(res, result, '验证码生成成功');
  } catch (err: any) {
    return fail(res, err.message || '验证码生成失败');
  }
}

export async function verify(req: Request, res: Response): Promise<void> {
  const { captchaId, answer, sliderX, clickPoints } = req.body;

  if (!captchaId) {
    return fail(res, '缺少验证码ID');
  }

  const isValid = await verifyCaptcha({
    captchaId,
    answer: answer || '',
    sliderX,
    clickPoints,
  });

  if (!isValid) {
    return fail(res, '验证码错误或已过期');
  }

  return success(res, null, '验证通过');
}

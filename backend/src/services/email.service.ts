/**
 * Email Service — Placeholder implementation.
 * Integrate with real email provider (e.g. SendGrid, nodemailer + SMTP) in production.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`[Email] To: ${to} | Subject: ${subject}`);
  console.log(`[Email] Body: ${body.substring(0, 100)}...`);
  // TODO: Integrate real email service
  return true;
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const subject = 'CalcMaster - 邮箱验证码';
  const body = `您的验证码是：${code}，有效期 5 分钟。请勿泄露给他人。`;
  return sendEmail(to, subject, body);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const subject = 'CalcMaster - 密码重置';
  const body = `您的密码重置验证码是：${code}，有效期 5 分钟。如非本人操作，请忽略。`;
  return sendEmail(to, subject, body);
}

export async function sendVipExpiryEmail(
  to: string,
  nickname: string,
  daysLeft: number,
): Promise<boolean> {
  const subject = 'CalcMaster - VIP 即将到期';
  const body = `${nickname}，您的 VIP 会员将于 ${daysLeft} 天后到期，请及时续费。`;
  return sendEmail(to, subject, body);
}

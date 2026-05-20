/**
 * SMS Service — Placeholder implementation.
 * Integrate with real SMS provider (e.g. Alibaba Cloud SMS, Tencent Cloud SMS) in production.
 */
export async function sendSMS(phone: string, code: string): Promise<boolean> {
  console.log(`[SMS] To: ${phone} | Code: ${code} | (placeholder — not actually sent)`);

  // TODO: Integrate real SMS gateway
  // const client = new SmsClient({ accessKeyId, accessKeySecret });
  // await client.sendSms({ PhoneNumbers: phone, SignName: 'CalcMaster', TemplateCode: 'SMS_123456', TemplateParam: { code } });

  return true;
}

export async function sendInviteSMS(phone: string, inviterName: string, inviteCode: string): Promise<boolean> {
  console.log(`[SMS] Invite to ${phone}: "${inviterName} invites you to CalcMaster! Code: ${inviteCode}"`);
  return true;
}

export async function sendVipExpirySMS(phone: string, daysLeft: number): Promise<boolean> {
  console.log(`[SMS] VIP expiry notice to ${phone}: Your VIP expires in ${daysLeft} days`);
  return true;
}

export async function sendRateAlertSMS(
  phone: string,
  from: string,
  to: string,
  rate: number,
): Promise<boolean> {
  console.log(`[SMS] Rate alert to ${phone}: ${from}/${to} reached ${rate}`);
  return true;
}

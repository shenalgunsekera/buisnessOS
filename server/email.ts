import emailjs from '@emailjs/nodejs';
import { getSettings } from './settings';

export type EmailConfig = {
  serviceId: string;
  paymentTemplateId: string;
  subscriptionTemplateId: string;
  publicKey: string;
  privateKey: string;
};

export async function loadEmailConfig(): Promise<EmailConfig | null> {
  const s = await getSettings();
  const fromDb = {
    serviceId: s.emailServiceId,
    paymentTemplateId: s.emailPaymentTemplateId,
    subscriptionTemplateId: s.emailSubscriptionTemplateId,
    publicKey: s.emailPublicKey,
    privateKey: s.emailPrivateKey,
  };
  const fromEnv = {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    paymentTemplateId: process.env.EMAILJS_PAYMENT_TEMPLATE_ID,
    subscriptionTemplateId: process.env.EMAILJS_SUBSCRIPTION_TEMPLATE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  };
  const merged = {
    serviceId: fromDb.serviceId || fromEnv.serviceId,
    paymentTemplateId: fromDb.paymentTemplateId || fromEnv.paymentTemplateId,
    subscriptionTemplateId: fromDb.subscriptionTemplateId || fromEnv.subscriptionTemplateId,
    publicKey: fromDb.publicKey || fromEnv.publicKey,
    privateKey: fromDb.privateKey || fromEnv.privateKey,
  };
  if (
    !merged.serviceId || !merged.paymentTemplateId || !merged.subscriptionTemplateId ||
    !merged.publicKey || !merged.privateKey
  ) return null;
  return merged as EmailConfig;
}

export async function sendEmail(
  templateId: string,
  variables: Record<string, string | number>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = await loadEmailConfig();
  if (!cfg) return { ok: false, error: 'EmailJS not configured' };
  try {
    await emailjs.send(cfg.serviceId, templateId, variables, {
      publicKey: cfg.publicKey,
      privateKey: cfg.privateKey,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function emailEnabled(): Promise<boolean> {
  return (await loadEmailConfig()) !== null;
}

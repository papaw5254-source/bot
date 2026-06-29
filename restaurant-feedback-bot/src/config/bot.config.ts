import { registerAs } from '@nestjs/config';

function parseAdminIds(): number[] {
  const raw = process.env.ADMIN_TELEGRAM_IDS || process.env.ADMIN_TELEGRAM_ID || '';
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n > 0);
}

export default registerAs('bot', () => ({
  token: process.env.BOT_TOKEN || '',
  webhookDomain: process.env.BOT_WEBHOOK_DOMAIN || '',
  adminTelegramId: parseInt(process.env.ADMIN_TELEGRAM_ID || '0', 10),
  adminTelegramIds: parseAdminIds(),
}));

import { registerAs } from '@nestjs/config';

export default registerAs('bot', () => ({
  token: process.env.BOT_TOKEN || '',
  webhookDomain: process.env.BOT_WEBHOOK_DOMAIN || '',
  adminTelegramId: parseInt(process.env.ADMIN_TELEGRAM_ID || '0', 10),
}));

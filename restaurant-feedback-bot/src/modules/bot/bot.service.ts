import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes, session } from 'telegraf';
import * as QRCode from 'qrcode';

export function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

import { UserService } from '../user/user.service';
import { FeedbackService } from '../feedback/feedback.service';
import { ReportService } from '../report/report.service';
import { RestaurantService } from '../restaurant/restaurant.service';
import { feedbackSahnaYaratish, FEEDBACK_SAHNA_NOMI } from './scenes/feedback.scene';
import { asosiyKlavyatura } from './keyboards/main.keyboard';

const HTML = { parse_mode: 'HTML' as const };

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  bot: Telegraf<any>;
  private adminTelegramId: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly feedbackService: FeedbackService,
    private readonly restaurantService: RestaurantService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('bot.token');
    if (!token) {
      this.logger.warn('BOT_TOKEN topilmadi, bot ishga tushmadi');
      return;
    }
    await this.restaurantService.asosiyRestoranTayyorla();
    this.adminTelegramId = this.configService.get<number>('bot.adminTelegramId') || 0;
    this.bot = new Telegraf(token);
    this.sahnalarniSozlash();
    this.buyruqlarniSozlash();
    this.botniIshgaTushirish();
  }

  private sahnalarniSozlash() {
    const feedbackSahna = feedbackSahnaYaratish(
      this.feedbackService,
      this.userService,
      async (xabar) => {
        await this.bot.telegram.sendMessage(String(this.adminTelegramId), xabar, HTML);
      },
    );
    const sahna = new Scenes.Stage([feedbackSahna]);
    this.bot.use(session());
    this.bot.use(sahna.middleware());
  }

  private buyruqlarniSozlash() {
    // /start
    this.bot.start(async (ctx) => {
      const tg = ctx.from;
      await this.userService.topOrCreate({
        telegramId: tg.id,
        firstName: tg.first_name,
        lastName: tg.last_name,
        username: tg.username,
      });

      const ism = escHtml(tg.first_name || 'Mehmon');
      await ctx.reply(
        `👋 Assalomu alaykum, <b>${ism}</b>!\n\n` +
        `🏛 <b>Marvarid Restaurant</b> ga xush kelibsiz!\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Bizni tanlagan va tashrif buyurganingiz uchun tashakkur! 🙏\n\n` +
        `Xodimlarimiz va taomlarimiz haqidagi <b>fikringiz</b> bizni yaxshilanishga undaydi.`,
        HTML,
      );

      if (!ishVaqtimi()) {
        await ctx.reply(yopiqXabar(), HTML);
        return;
      }

      await ctx.scene.enter(FEEDBACK_SAHNA_NOMI);
    });

    // Baholash
    this.bot.hears('⭐ Baholash', async (ctx) => {
      if (!ishVaqtimi()) return ctx.reply(yopiqXabar(), HTML);
      await ctx.scene.enter(FEEDBACK_SAHNA_NOMI);
    });

    // Mening baholarim
    this.bot.hears('📋 Mening baholarim', async (ctx) => {
      const user = await this.userService.telegramIdByTopish(ctx.from.id);
      if (!user) {
        return ctx.reply(
          '⚠️ Avval /start buyrug\'ini yuboring.',
          { ...HTML, ...asosiyKlavyatura() },
        );
      }

      const { malumot: fikrlar } = await this.feedbackService.barchasiniTopish({
        page: 1,
        limit: 20,
      });
      const mening = fikrlar.filter((f) => f.userId === user.id).slice(0, 5);

      if (mening.length === 0) {
        return ctx.reply(
          `📋 <b>Sizning baholaringiz</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `😊 Hali hech kimni baholamagansiz.\n\n` +
          `Xodimlarimiz va taomlarimiz haqida fikr bildiring —\n` +
          `bu bepul va juda foydali! ✨`,
          HTML,
        );
      }

      const satrlar = mening
        .map((f, i) => {
          const kim = f.waiterName ? `👨‍🍳 <b>${escHtml(f.waiterName)}</b>` : `🍽 <b>Taom</b>`;
          const izoh = f.comment ? `\n    💬 <i>${escHtml(f.comment.substring(0, 60))}</i>` : '';
          return `${i + 1}. ${kim}  ${'⭐'.repeat(f.rating)} (${f.rating}/5)${izoh}`;
        })
        .join('\n\n');

      await ctx.reply(
        `📋 <b>Sizning so'nggi baholaringiz</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        satrlar +
        `\n\n💙 Fikr-mulohazalaringiz uchun rahmat!`,
        HTML,
      );
    });

    // Aloqa
    this.bot.hears('📞 Aloqa', async (ctx) => {
      await ctx.reply(
        `📞 <b>Bog'lanish ma'lumotlari</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🏛 <b>Marvarid Restaurant</b>\n\n` +
        `📍 <b>Manzil:</b>\nXonqa tumani, O'zbekiston\n\n` +
        `☎️ <b>Telefon:</b>\n+998 88 041 24 24\n\n` +
        `⏰ <b>Ish vaqti:</b>\nHar kuni: 10:00 — 00:00\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `💬 Muammo yoki taklif bo'lsa — xodimni baholab izoh qoldiring!`,
        HTML,
      );
    });

    // /yordam
    this.bot.command('yordam', async (ctx) => {
      const adminQator = ctx.from.id === this.adminTelegramId
        ? `\n\n🔐 <b>Admin buyruqlari:</b>\n/hisobot — Hisobotlarni ko'rish\n/qr — QR kod yaratish`
        : '';
      await ctx.reply(
        `📖 <b>Yordam</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<b>Asosiy tugmalar:</b>\n` +
        `⭐ Baholash — Xodim yoki taomni baholang\n` +
        `📋 Mening baholarim — So'nggi baholaringiz\n` +
        `📞 Aloqa — Bog'lanish ma'lumotlari` +
        adminQator,
        HTML,
      );
    });

    // /qr — faqat admin
    this.bot.command('qr', async (ctx) => {
      if (ctx.from.id !== this.adminTelegramId) {
        return ctx.reply('⛔️ Bu buyruq faqat admin uchun.', HTML);
      }
      try {
        const botInfo = await this.bot.telegram.getMe();
        const buf = await QRCode.toBuffer(`https://t.me/${botInfo.username}`, {
          width: 800,
          margin: 3,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
        await ctx.replyWithPhoto(
          { source: buf, filename: 'marvarid_qr.png' },
          {
            caption:
              `🍽 <b>Marvarid Restaurant</b>\n` +
              `━━━━━━━━━━━━━━━━━━━━\n\n` +
              `📱 QR kodni skanerlang va xodimni baholang!\n\n` +
              `🖨 Chop etib har bir stolga qo'ying.\n` +
              `Mehmonlar siz haqingizda fikr bildiradi!`,
            parse_mode: 'HTML',
          },
        );
      } catch (err: any) {
        await ctx.reply(`❌ QR yaratishda xato: <code>${escHtml(err?.message || 'Noma\'lum xato')}</code>`, HTML);
      }
    });

    // /hisobot — faqat admin
    this.bot.command('hisobot', async (ctx) => {
      if (ctx.from.id !== this.adminTelegramId) {
        return ctx.reply('⛔️ Bu buyruq faqat admin uchun.', HTML);
      }
      await ctx.reply('⏳ Hisobotlar tayyorlanmoqda...', HTML);
      try {
        const kunlik = await this.reportService.kunlikMatnYaratish();
        await ctx.reply(kunlik, HTML);
      } catch (err: any) {
        await ctx.reply(`❌ Kunlik hisobot xatosi: <code>${escHtml(err?.message)}</code>`, HTML);
      }
      try {
        const oylik = await this.reportService.oylikMatnYaratish();
        await ctx.reply(oylik, HTML);
      } catch (err: any) {
        await ctx.reply(`❌ Oylik hisobot xatosi: <code>${escHtml(err?.message)}</code>`, HTML);
      }
    });

    // Noma'lum xabar
    this.bot.on('message', async (ctx) => {
      try {
        await ctx.reply(
          `🤔 Tushunmadim.\n\n` +
          `Iltimos, pastdagi tugmalardan foydalaning\n` +
          `yoki /start buyrug'ini yuboring.`,
          { ...HTML, ...asosiyKlavyatura() },
        );
      } catch { /* foydalanuvchi botni bloklagan */ }
    });
  }

  private botniIshgaTushirish() {
    this.bot.catch((err: any) => {
      const code = err?.response?.error_code;
      if (code === 403 || code === 400) return;
      this.logger.error('Bot xatosi: ' + (err?.message || err));
    });

    this.bot
      .launch()
      .then(() => this.logger.log('Bot to\'xtatildi'))
      .catch((error) => this.logger.error('Bot ishga tushmadi:', error));

    this.logger.log('✅ Bot muvaffaqiyatli ishga tushdi');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

function ishVaqtimi(): boolean {
  const soat = new Date().toLocaleTimeString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = soat.split(':').map(Number);
  const daqiqa = h * 60 + m;
  return daqiqa >= 10 * 60;
}

function yopiqXabar(): string {
  return (
    `🌙 <b>Marvarid restoran hozir yopiq</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⏰ <b>Ish vaqti:</b>\n` +
    `Har kuni: 10:00 — 00:00\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `😊 Fikringiz biz uchun juda muhim!\n` +
    `Ish vaqtida qaytib keling, baholashingizni kutamiz.\n\n` +
    `🙏 Rahmat!`
  );
}

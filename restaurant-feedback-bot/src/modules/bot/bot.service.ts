import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Scenes, session } from 'telegraf';
import * as QRCode from 'qrcode';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
import { UserService } from '../user/user.service';
import { FeedbackService } from '../feedback/feedback.service';
import { ReportService } from '../report/report.service';
import {
  feedbackSahnaYaratish,
  FEEDBACK_SAHNA_NOMI,
} from './scenes/feedback.scene';
import { asosiyKlavyatura } from './keyboards/main.keyboard';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  bot: Telegraf<any>;
  private adminTelegramId: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly feedbackService: FeedbackService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('bot.token');
    if (!token) {
      this.logger.warn('BOT_TOKEN topilmadi, bot ishga tushmadi');
      return;
    }

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
        await this.bot.telegram.sendMessage(String(this.adminTelegramId), xabar, {
          parse_mode: 'HTML',
        });
      },
    );

    const sahna = new Scenes.Stage([feedbackSahna]);
    this.bot.use(session());
    this.bot.use(sahna.middleware());
  }

  private buyruqlarniSozlash() {
    // /start — xush kelibsiz + darhol xodim tanlash
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
        `Assalomu alaykum, ${ism}! 👋\n\n` +
        `🏛 <b>Marvarid Restaurant</b> ga xush kelibsiz!\n\n` +
        `Bizga xizmat ko'rsatgan xodimni baholang — fikringiz juda muhim!`,
        { parse_mode: 'HTML' },
      );

      if (!ishVaqtimi()) {
        await ctx.reply(yopiqXabar());
        return;
      }

      await ctx.scene.enter(FEEDBACK_SAHNA_NOMI);
    });

    // ⭐ Baholash tugmasi
    this.bot.hears('⭐ Baholash', async (ctx) => {
      if (!ishVaqtimi()) return ctx.reply(yopiqXabar());
      await ctx.scene.enter(FEEDBACK_SAHNA_NOMI);
    });

    // 📋 Mening baholarim
    this.bot.hears('📋 Mening baholarim', async (ctx) => {
      const user = await this.userService.telegramIdByTopish(ctx.from.id);
      if (!user) return ctx.reply('Botni /start orqali ishga tushiring.');

      const { malumot: fikrlar } = await this.feedbackService.barchasiniTopish({ page: 1, limit: 10 });
      const mening = fikrlar.filter((f) => f.userId === user.id);

      if (mening.length === 0) {
        return ctx.reply(
          'Siz hali hech kimni baholmagansiz.\n\n⭐ Baholash tugmasini bosing!',
        );
      }

      const matn = mening
        .map((f, i) =>
          `${i + 1}. ${'⭐'.repeat(f.rating)} (${f.rating}/5)\n` +
          `   👨‍🍳 ${escHtml(f.waiterName || '—')}\n` +
          `   ${f.comment ? `💬 ${escHtml(f.comment.substring(0, 60))}` : ''}`,
        )
        .join('\n\n');

      await ctx.reply(
        `📋 <b>Sizning so'nggi baholaringiz:</b>\n\n${matn}`,
        { parse_mode: 'HTML' },
      );
    });

    // 📞 Aloqa
    this.bot.hears('📞 Aloqa', async (ctx) => {
      await ctx.reply(
        `📞 <b>Bog'lanish uchun:</b>\n\n` +
        `📍 Manzil: Xonqa tumani\n` +
        `📱 Telefon: +998880412424\n\n` +
        `Muammo bo'lsa, xodimni baholab izoh qoldiring!`,
        { parse_mode: 'HTML' },
      );
    });

    // /yordam
    this.bot.command('yordam', async (ctx) => {
      const adminQ = ctx.from.id === this.adminTelegramId
        ? '\n/hisobot — Hisobotni ko\'rish\n/qr — QR kod olish' : '';
      await ctx.reply(
        `📋 <b>Buyruqlar:</b>\n\n` +
        `/start — Boshlanish${adminQ}`,
        { parse_mode: 'HTML' },
      );
    });

    // /qr — admin uchun
    this.bot.command('qr', async (ctx) => {
      if (ctx.from.id !== this.adminTelegramId) return ctx.reply('⛔ Faqat admin.');
      try {
        const botInfo = await this.bot.telegram.getMe();
        const buf = await QRCode.toBuffer(`https://t.me/${botInfo.username}`, {
          width: 800, margin: 3,
          color: { dark: '#000000', light: '#ffffff' },
        });
        await ctx.replyWithPhoto(
          { source: buf, filename: 'marvarid_qr.png' },
          {
            caption:
              `🍽 <b>Marvarid Restaurant</b>\n\n` +
              `QR kodni skanerlang va xodimni baholang!\n` +
              `🖨 Chop etib har bir stolga qo'ying.`,
            parse_mode: 'HTML',
          },
        );
      } catch (err: any) {
        await ctx.reply('❌ Xato: ' + err?.message);
      }
    });

    // /hisobot — admin uchun
    this.bot.command('hisobot', async (ctx) => {
      if (ctx.from.id !== this.adminTelegramId) return ctx.reply('⛔ Faqat admin.');
      await ctx.reply('⏳ Hisobotlar tayyorlanmoqda...');
      try {
        const kunlik = await this.reportService.kunlikMatnYaratish();
        await ctx.reply(kunlik, { parse_mode: 'HTML' });
      } catch (err: any) {
        await ctx.reply('❌ Kunlik hisobot xatosi: ' + err?.message);
      }
      try {
        const oylik = await this.reportService.oylikMatnYaratish();
        await ctx.reply(oylik, { parse_mode: 'HTML' });
      } catch (err: any) {
        await ctx.reply('❌ Oylik hisobot xatosi: ' + err?.message);
      }
    });

    this.bot.on('message', async (ctx) => {
      await ctx.reply('Menyudan foydalaning.', asosiyKlavyatura());
    });
  }

  private botniIshgaTushirish() {
    this.bot
      .launch()
      .then(() => this.logger.log('Bot to\'xtatildi'))
      .catch((error) => this.logger.error('Bot xatosi', error));

    this.logger.log('Bot muvaffaqiyatli ishga tushdi (polling rejimi)');
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}


function ishVaqtimi(): boolean {
  const hozir = new Date();
  const soat = hozir.toLocaleTimeString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = soat.split(':').map(Number);
  const daqiqa = h * 60 + m;
  return daqiqa >= 10 * 60 && daqiqa < 23 * 60;
}

function yopiqXabar(): string {
  return (
    '🕙 <b>Restoran hozir yopiq</b>\n\n' +
    '⏰ Ish vaqti: <b>10:00 — 23:00</b>\n\n' +
    'Ish vaqtida qaytib keling, fikringizni qabul qilamiz! 🙏'
  );
}

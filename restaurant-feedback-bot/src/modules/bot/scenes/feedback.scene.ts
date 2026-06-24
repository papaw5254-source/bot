import { Scenes } from 'telegraf';
import { FeedbackService } from '../../feedback/feedback.service';
import { UserService } from '../../user/user.service';
import { FeedbackCategory } from '../../feedback/entities/feedback.entity';
import {
  reytingKlavyaturasi,
  xodimlarKlavyaturasi,
} from '../keyboards/main.keyboard';

export const FEEDBACK_SAHNA_NOMI = 'FEEDBACK_SAHNA';

const RESTORAN_ID = 1;

interface FeedbackSessiya {
  qadam: string;
  reyting?: number;
  xodimIsmi?: string;
  xodimRoli?: string;
  kategoriya?: FeedbackCategory;
}

// Xodimlar va kategoriyalar ro'yxati — qo'shish/o'chirish shu yerdan
const XODIMLAR: Record<string, { ismi: string; roli: string; kategoriya: FeedbackCategory }> = {
  '👨‍🍳 Amirxon':    { ismi: 'Amirxon', roli: 'Ofitsiant', kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Yusufboy':   { ismi: 'Yusufboy', roli: 'Ofitsiant', kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ortiqvoy':   { ismi: 'Ortiqvoy', roli: 'Ofitsiant', kategoriya: FeedbackCategory.SERVICE },
  '👩‍💼 Xalima':     { ismi: 'Xalima', roli: 'Administrator', kategoriya: FeedbackCategory.SERVICE },
  '🍽 Taom sifati': { ismi: '', roli: 'Taom', kategoriya: FeedbackCategory.FOOD },
};

const REYTING_MAP: Record<string, number> = {
  '⭐ 1': 1, '⭐⭐ 2': 2, '⭐⭐⭐ 3': 3,
  '⭐⭐⭐⭐ 4': 4, '⭐⭐⭐⭐⭐ 5': 5,
};

const BEKOR_KLAVYATURA = {
  reply_markup: {
    keyboard: [[{ text: '❌ Bekor qilish' }]],
    resize_keyboard: true,
  },
};

const ASOSIY_KLAVYATURA = {
  reply_markup: {
    keyboard: [
      [{ text: '⭐ Baholash' }, { text: '📋 Mening baholarim' }],
      [{ text: '📞 Aloqa' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  },
};

export function feedbackSahnaYaratish(
  feedbackService: FeedbackService,
  userService: UserService,
  adminGaXabar: (xabar: string) => Promise<void>,
): Scenes.BaseScene<any> {
  const sahna = new Scenes.BaseScene<any>(FEEDBACK_SAHNA_NOMI);

  sahna.enter(async (ctx) => {
    ctx.session.feedback = { qadam: 'xodim' } as FeedbackSessiya;
    await ctx.reply(
      '👤 Qaysi xodimni baholamoqchisiz?',
      xodimlarKlavyaturasi(),
    );
  });

  sahna.hears('❌ Bekor qilish', async (ctx) => {
    ctx.session.feedback = undefined;
    await ctx.reply('❌ Bekor qilindi.', ASOSIY_KLAVYATURA);
    return ctx.scene.leave();
  });

  sahna.on('text', async (ctx) => {
    const matn: string = ctx.message.text;
    const sessiya: FeedbackSessiya = ctx.session.feedback;
    if (!sessiya) return ctx.scene.leave();

    // 1. Xodim tanlash
    if (sessiya.qadam === 'xodim') {
      const xodim = XODIMLAR[matn];
      if (!xodim) {
        return ctx.reply('Iltimos, ro\'yxatdan xodimni tanlang.', xodimlarKlavyaturasi());
      }
      sessiya.xodimIsmi = xodim.ismi;
      sessiya.xodimRoli = xodim.roli;
      sessiya.kategoriya = xodim.kategoriya;
      sessiya.qadam = 'reyting';

      const savolMatn = xodim.kategoriya === FeedbackCategory.FOOD
        ? `🍽 <b>Taom sifatini</b> baholang (1 — yomon, 5 — a'lo):`
        : `👨‍🍳 <b>${xodim.ismi}</b> (${xodim.roli})\n\nXizmat sifatini baholang:`;

      return ctx.reply(savolMatn, { parse_mode: 'HTML', ...reytingKlavyaturasi() });
    }

    // 2. Reyting tanlash
    if (sessiya.qadam === 'reyting') {
      const reyting = REYTING_MAP[matn];
      if (!reyting) {
        return ctx.reply('Iltimos, ro\'yxatdan baho tanlang.', reytingKlavyaturasi());
      }
      sessiya.reyting = reyting;

      if (reyting <= 3) {
        sessiya.qadam = 'izoh_majburiy';
        return ctx.reply(
          `${matn} baho qo'ydingiz.\n\n✍️ Sababini yozing (majburiy, kamida 5 belgi):`,
          BEKOR_KLAVYATURA,
        );
      } else {
        sessiya.qadam = 'izoh_ixtiyoriy';
        return ctx.reply(
          `${matn} baho qo'ydingiz! 🎉\n\n💬 Qo'shimcha izoh (ixtiyoriy):`,
          {
            reply_markup: {
              keyboard: [
                [{ text: '➡️ O\'tkazib yuborish' }],
                [{ text: '❌ Bekor qilish' }],
              ],
              resize_keyboard: true,
            },
          },
        );
      }
    }

    // 3. Majburiy izoh
    if (sessiya.qadam === 'izoh_majburiy') {
      if (matn.trim().length < 5) {
        return ctx.reply('⚠️ Kamida 5 ta belgi kiriting:');
      }
      await saqlashVaYuborish(ctx, sessiya, matn.trim(), feedbackService, userService, adminGaXabar);
      return;
    }

    // 4. Ixtiyoriy izoh
    if (sessiya.qadam === 'izoh_ixtiyoriy') {
      const izoh = matn === '➡️ O\'tkazib yuborish' ? undefined : matn.trim();
      await saqlashVaYuborish(ctx, sessiya, izoh, feedbackService, userService, adminGaXabar);
      return;
    }
  });

  return sahna;
}

async function saqlashVaYuborish(
  ctx: any,
  sessiya: FeedbackSessiya,
  izoh: string | undefined,
  feedbackService: FeedbackService,
  userService: UserService,
  adminGaXabar: (xabar: string) => Promise<void>,
) {
  const tg = ctx.from!;
  const user = await userService.topOrCreate({
    telegramId: tg.id,
    firstName: tg.first_name,
    lastName: tg.last_name,
    username: tg.username,
  });

  const isTaom = sessiya.kategoriya === FeedbackCategory.FOOD;

  await feedbackService.yaratish({
    userId: user.id,
    restaurantId: RESTORAN_ID,
    rating: sessiya.reyting!,
    category: sessiya.kategoriya ?? FeedbackCategory.SERVICE,
    comment: izoh,
    waiterName: isTaom ? undefined : sessiya.xodimIsmi,
  });

  // Admin xabardorligi
  const foydalanuvchi = [tg.first_name, tg.last_name].filter(Boolean).join(' ');
  const holat = sessiya.reyting! <= 3 ? '⚠️ Past baho!' : sessiya.reyting! === 5 ? '🌟 A\'lo baho!' : '✅ Yangi baho';
  const kimHaqida = isTaom
    ? '🍽 <b>Taom sifati</b>'
    : `👨‍🍳 <b>${escHtml(sessiya.xodimIsmi!)} (${sessiya.xodimRoli})</b>`;
  let adminXabar =
    `🔔 <b>${holat}</b>\n\n` +
    `👤 ${escHtml(foydalanuvchi)}${tg.username ? ` (@${tg.username})` : ''}\n` +
    `${kimHaqida}\n` +
    `${'⭐'.repeat(sessiya.reyting!)} <b>(${sessiya.reyting}/5)</b>`;
  if (izoh) adminXabar += `\n💬 <i>${escHtml(izoh.substring(0, 100))}</i>`;
  adminGaXabar(adminXabar).catch(() => {});

  // Foydalanuvchiga javob
  const yulduz = '⭐'.repeat(sessiya.reyting!);
  const sarlavha = isTaom ? '🍽 <b>Taom sifati</b>' : `👨‍🍳 <b>${escHtml(sessiya.xodimIsmi!)}</b>`;
  const javob =
    sessiya.reyting! <= 3
      ? `✅ Fikringiz qabul qilindi!\n\n${sarlavha}\n${yulduz} (${sessiya.reyting}/5)\n\nKo'rib chiqamiz, rahmat! 🙏`
      : `✅ Bahoingiz uchun rahmat!\n\n${sarlavha}\n${yulduz} (${sessiya.reyting}/5)\n\nFikringiz bizni ilhomlantiradi! 😊`;

  await ctx.reply(javob, { parse_mode: 'HTML', ...ASOSIY_KLAVYATURA });
  ctx.session.feedback = undefined;
  return ctx.scene.leave();
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

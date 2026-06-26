import { Scenes } from 'telegraf';
import { FeedbackService } from '../../feedback/feedback.service';
import { UserService } from '../../user/user.service';
import { FeedbackCategory } from '../../feedback/entities/feedback.entity';
import { reytingKlavyaturasi, xodimlarKlavyaturasi } from '../keyboards/main.keyboard';

export const FEEDBACK_SAHNA_NOMI = 'FEEDBACK_SAHNA';

const RESTORAN_ID = 1;

interface FeedbackSessiya {
  qadam: string;
  reyting?: number;
  xodimIsmi?: string;
  xodimRoli?: string;
  kategoriya?: FeedbackCategory;
}

const XODIMLAR: Record<string, { ismi: string; roli: string; kategoriya: FeedbackCategory }> = {
  '👩‍💼 Administrator — Xalima':  { ismi: 'Xalima',   roli: 'Administrator', kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Amirxon':    { ismi: 'Amirxon',  roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Dilafruz':   { ismi: 'Dilafruz', roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Ortiqboy':   { ismi: 'Ortiqboy', roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Mansur':     { ismi: 'Mansur',   roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Yusufboy':   { ismi: 'Yusufboy', roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '🍽 Taom sifati':               { ismi: '',         roli: 'Taom',          kategoriya: FeedbackCategory.FOOD },
};

const REYTING_MAP: Record<string, number> = {
  '⭐ 1': 1, '⭐⭐ 2': 2, '⭐⭐⭐ 3': 3,
  '⭐⭐⭐⭐ 4': 4, '⭐⭐⭐⭐⭐ 5': 5,
};

const HTML = { parse_mode: 'HTML' as const };

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

const OTKAZIB_YUBORISH_KLAVYATURA = {
  reply_markup: {
    keyboard: [
      [{ text: '➡️ O\'tkazib yuborish' }],
      [{ text: '❌ Bekor qilish' }],
    ],
    resize_keyboard: true,
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
      `👥 <b>Xodimni tanlang</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Sizga xizmat ko'rsatgan xodimni yoki\n` +
      `baholamoqchi bo'lgan bo'limni tanlang:`,
      { ...HTML, ...xodimlarKlavyaturasi() },
    );
  });

  sahna.hears('❌ Bekor qilish', async (ctx) => {
    ctx.session.feedback = undefined;
    await ctx.reply(
      `❌ <b>Bekor qilindi</b>\n\n` +
      `Asosiy menyuga qaytdingiz.\n` +
      `Istalgan vaqt yana baholashingiz mumkin ⭐`,
      { ...HTML, ...ASOSIY_KLAVYATURA },
    );
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
        return ctx.reply(
          `⚠️ Iltimos, ro'yxatdan xodimni tanlang.\n\n` +
          `Tugmalardan birini bosing 👇`,
          { ...HTML, ...xodimlarKlavyaturasi() },
        );
      }

      sessiya.xodimIsmi = xodim.ismi;
      sessiya.xodimRoli = xodim.roli;
      sessiya.kategoriya = xodim.kategoriya;
      sessiya.qadam = 'reyting';

      const tanlovMatn = xodim.kategoriya === FeedbackCategory.FOOD
        ? `🍽 <b>Taom sifatini baholang</b>`
        : `👨‍🍳 <b>${esc(xodim.ismi)}</b> — ${esc(xodim.roli)}`;

      return ctx.reply(
        `${tanlovMatn}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⭐ Bahoni tanlang:\n\n` +
        `1 — Yomon 😞\n` +
        `2 — Qoniqarsiz 😐\n` +
        `3 — O'rtacha 🙂\n` +
        `4 — Yaxshi 😊\n` +
        `5 — A'lo 🤩`,
        { ...HTML, ...reytingKlavyaturasi() },
      );
    }

    // 2. Reyting
    if (sessiya.qadam === 'reyting') {
      const reyting = REYTING_MAP[matn];
      if (!reyting) {
        return ctx.reply(
          `⚠️ Iltimos, bahoni tugmadan tanlang 👇`,
          { ...HTML, ...reytingKlavyaturasi() },
        );
      }
      sessiya.reyting = reyting;

      if (reyting <= 3) {
        sessiya.qadam = 'izoh_majburiy';
        const reytingBelgisi = ['', '😞', '😐', '🙂'][reyting] || '';
        return ctx.reply(
          `${'⭐'.repeat(reyting)} <b>${reytingBelgisi}</b> baho qo'ydingiz\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `✍️ <b>Muammoni tushuntiring</b>\n\n` +
          `Sizning izohingiz vaziyatni tuzatishga yordam beradi.\n` +
          `<i>Kamida 5 ta belgi yozing:</i>`,
          { ...HTML, ...BEKOR_KLAVYATURA },
        );
      } else {
        sessiya.qadam = 'izoh_ixtiyoriy';
        const emoji = reyting === 5 ? '🤩' : '😊';
        return ctx.reply(
          `${'⭐'.repeat(reyting)} ${emoji} <b>Ajoyib baho!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `💬 <b>Qo'shimcha fikr qoldiring</b> <i>(ixtiyoriy)</i>\n\n` +
          `Nima yoqdi? Maqtovingiz xodimimizni rag'batlantiradi! 🌟`,
          { ...HTML, ...OTKAZIB_YUBORISH_KLAVYATURA },
        );
      }
    }

    // 3. Majburiy izoh
    if (sessiya.qadam === 'izoh_majburiy') {
      if (matn.trim().length < 5) {
        return ctx.reply(
          `⚠️ Izoh juda qisqa.\n\n` +
          `Kamida <b>5 ta belgi</b> yozing, iltimos:`,
          HTML,
        );
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
  const ism = [tg.first_name, tg.last_name].filter(Boolean).join(' ');
  const username = tg.username ? ` (@${tg.username})` : '';
  const holat = sessiya.reyting! <= 2
    ? '🔴 Past baho!'
    : sessiya.reyting! === 3
    ? '🟡 O\'rta baho'
    : sessiya.reyting! === 5
    ? '🟢 A\'lo baho!'
    : '🟢 Yaxshi baho';

  const kimHaqida = isTaom
    ? '🍽 <b>Taom sifati</b>'
    : `👨‍🍳 <b>${esc(sessiya.xodimIsmi!)}</b> (${esc(sessiya.xodimRoli!)})`;

  const vaqt = new Date().toLocaleTimeString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
  });

  let adminXabar =
    `🔔 <b>${holat}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 ${esc(ism)}${username}\n` +
    `${kimHaqida}\n` +
    `${'⭐'.repeat(sessiya.reyting!)} <b>(${sessiya.reyting}/5)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n`;
  if (izoh) adminXabar += `💬 <i>"${esc(izoh.substring(0, 200))}"</i>\n━━━━━━━━━━━━━━━━━━━━\n`;
  adminXabar += `🕐 ${vaqt}`;

  adminGaXabar(adminXabar).catch(() => {});

  // Foydalanuvchiga tasdiqlash
  const sarlavha = isTaom
    ? '🍽 <b>Taom sifati</b>'
    : `👨‍🍳 <b>${esc(sessiya.xodimIsmi!)}</b>`;

  const yulduz = '⭐'.repeat(sessiya.reyting!);
  const foydalanuvchiIsmi = esc(tg.first_name || 'Mehmon');

  let javob: string;
  if (sessiya.reyting! <= 3) {
    javob =
      `✅ <b>Fikringiz qabul qilindi, ${foydalanuvchiIsmi}!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${sarlavha}\n` +
      `${yulduz} (${sessiya.reyting}/5)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Izohingiz ko'rib chiqiladi va muammo\n` +
      `imkon qadar tezroq hal qilinadi. 🙏\n\n` +
      `💙 <b>Marvarid Restaurant</b>`;
  } else {
    javob =
      `🎉 <b>Rahmat, ${foydalanuvchiIsmi}!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${sarlavha}\n` +
      `${yulduz} (${sessiya.reyting}/5)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Ijobiy bahongiz xodimimizni rag'batlantiradi! 🌟\n\n` +
      `💙 <b>Marvarid Restaurant</b> ga tashrif buyurganingiz\nuchun tashakkur!`;
  }

  await ctx.reply(javob, { parse_mode: 'HTML', ...ASOSIY_KLAVYATURA });
  ctx.session.feedback = undefined;
  return ctx.scene.leave();
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

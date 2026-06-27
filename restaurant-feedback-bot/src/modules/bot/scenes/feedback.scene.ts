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
  '👩‍💼 Administrator — Xalima': { ismi: 'Xalima',   roli: 'Administrator', kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Amirxon':   { ismi: 'Amirxon',  roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Dilafruz':  { ismi: 'Dilafruz', roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Ortiqboy':  { ismi: 'Ortiqboy', roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Mansur':    { ismi: 'Mansur',   roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '👨‍🍳 Ofitsiant — Yusufboy':  { ismi: 'Yusufboy', roli: 'Ofitsiant',     kategoriya: FeedbackCategory.SERVICE },
  '🍽 Taom sifati':              { ismi: '',         roli: 'Taom',          kategoriya: FeedbackCategory.FOOD },
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

export function feedbackSahnaYaratish(
  feedbackService: FeedbackService,
  userService: UserService,
  adminGaXabar: (xabar: string) => Promise<void>,
): Scenes.BaseScene<any> {
  const sahna = new Scenes.BaseScene<any>(FEEDBACK_SAHNA_NOMI);

  sahna.enter(async (ctx) => {
    ctx.session.feedback = { qadam: 'xodim' } as FeedbackSessiya;
    await ctx.reply(
      `👥 <b>Kim haqida fikr bildirasiz?</b>\n\n` +
      `Xodimni yoki bo'limni tanlang 👇`,
      { ...HTML, ...xodimlarKlavyaturasi() },
    );
  });

  sahna.hears('❌ Bekor qilish', async (ctx) => {
    ctx.session.feedback = undefined;
    await ctx.reply(
      `❌ <b>Bekor qilindi</b>\n\n` +
      `Asosiy menyuga qaytdingiz.`,
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
          `⚠️ Iltimos, ro'yxatdan xodimni tanlang.\n\nTugmalardan birini bosing 👇`,
          { ...HTML, ...xodimlarKlavyaturasi() },
        );
      }

      sessiya.xodimIsmi = xodim.ismi;
      sessiya.xodimRoli = xodim.roli;
      sessiya.kategoriya = xodim.kategoriya;
      sessiya.qadam = 'reyting';

      const sarlavha = xodim.kategoriya === FeedbackCategory.FOOD
        ? `🍽 <b>Taom sifati</b>`
        : `👨‍🍳 <b>${esc(xodim.ismi)}</b>  ·  ${esc(xodim.roli)}`;

      return ctx.reply(
        `${sarlavha}\n\n` +
        `⭐ Bahoni tanlang:\n\n` +
        `1  Yomon  😞\n` +
        `2  Qoniqarsiz  😐\n` +
        `3  O'rtacha  🙂\n` +
        `4  Yaxshi  😊\n` +
        `5  A'lo  🤩`,
        { ...HTML, ...reytingKlavyaturasi() },
      );
    }

    // 2. Reyting
    if (sessiya.qadam === 'reyting') {
      const reyting = REYTING_MAP[matn];
      if (!reyting) {
        return ctx.reply(
          `⚠️ Bahoni tugmadan tanlang 👇`,
          { ...HTML, ...reytingKlavyaturasi() },
        );
      }
      sessiya.reyting = reyting;
      sessiya.qadam = 'izoh';

      const emoji = reyting <= 2 ? '😞' : reyting === 3 ? '🙂' : reyting === 4 ? '😊' : '🤩';
      return ctx.reply(
        `${'⭐'.repeat(reyting)}  <b>${reyting} / 5</b>  ${emoji}\n\n` +
        `✍️ Izoh yozing:`,
        { ...HTML, ...BEKOR_KLAVYATURA },
      );
    }

    // 3. Izoh — yakunlanadi
    if (sessiya.qadam === 'izoh') {
      if (matn.trim().length < 3) {
        return ctx.reply(
          `⚠️ Izoh juda qisqa.\n\nKamida 3 ta harf yozing:`,
          HTML,
        );
      }
      await saqlashVaYuborish(ctx, sessiya, matn.trim(), feedbackService, userService, adminGaXabar);
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

  const ism = [tg.first_name, tg.last_name].filter(Boolean).join(' ');
  const username = tg.username ? `  ·  @${tg.username}` : '';
  const r = sessiya.reyting!;
  const holatBelgi = r <= 2 ? '🔴' : r === 3 ? '🟡' : '🟢';
  const holatMatn = r <= 2 ? 'Past baho' : r === 3 ? "O'rta baho" : r === 4 ? 'Yaxshi baho' : "A'lo baho!";

  const kimHaqida = isTaom
    ? `🍽 <b>Taom sifati</b>`
    : `👨‍🍳 <b>${esc(sessiya.xodimIsmi!)}</b>  ·  ${esc(sessiya.xodimRoli!)}`;

  const vaqt = new Date().toLocaleTimeString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
  });

  const adminXabar =
    `${holatBelgi} <b>${holatMatn}</b>\n\n` +
    `👤 <b>${esc(ism)}</b>${username}\n` +
    `${kimHaqida}\n` +
    `${'⭐'.repeat(r)}  <b>${r} / 5</b>` +
    (izoh ? `\n\n💬 <i>«${esc(izoh.substring(0, 200))}»</i>` : '') +
    `\n\n🕐 ${vaqt}`;

  adminGaXabar(adminXabar).catch(() => {});

  const sarlavha = isTaom
    ? '🍽 <b>Taom sifati</b>'
    : `👨‍🍳 <b>${esc(sessiya.xodimIsmi!)}</b>  ·  ${esc(sessiya.xodimRoli!)}`;

  const foydalanuvchiIsmi = esc(tg.first_name || 'Mehmon');

  let javob: string;
  if (r <= 3) {
    javob =
      `✅ <b>Fikringiz qabul qilindi!</b>\n\n` +
      `${sarlavha}\n` +
      `${'⭐'.repeat(r)}  <b>${r} / 5</b>\n` +
      (izoh ? `💬 <i>«${esc(izoh.substring(0, 100))}»</i>\n` : '') +
      `\nIzohingiz ko'rib chiqiladi 🙏\n` +
      `💙 <b>Marvarid Restaurant</b>`;
  } else {
    javob =
      `🎉 <b>Rahmat, ${foydalanuvchiIsmi}!</b>\n\n` +
      `${sarlavha}\n` +
      `${'⭐'.repeat(r)}  <b>${r} / 5</b>\n` +
      (izoh ? `💬 <i>«${esc(izoh.substring(0, 100))}»</i>\n` : '') +
      `\nBahongiz xodimimizni rag'batlantiradi! 🌟\n` +
      `💙 <b>Marvarid Restaurant</b>`;
  }

  await ctx.reply(javob, { parse_mode: 'HTML', ...ASOSIY_KLAVYATURA });
  ctx.session.feedback = undefined;
  return ctx.scene.leave();
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

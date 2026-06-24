import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Feedback } from '../feedback/entities/feedback.entity';
import { BotService } from '../bot/bot.service';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('30 23 * * *', { timeZone: 'Asia/Tashkent' })
  async kunlikHisobot() {
    this.logger.log('Kunlik hisobot yuborilmoqda...');
    const matn = await this.kunlikMatnYaratish();
    await this.adminGaYuborish(matn);
  }

  @Cron('0 20 28-31 * *', { timeZone: 'Asia/Tashkent' })
  async oylikHisobotTekshirish() {
    const bugun = new Date();
    const ertasi = new Date(bugun);
    ertasi.setDate(ertasi.getDate() + 1);
    if (ertasi.getMonth() === bugun.getMonth()) return;
    await this.oylikHisobot();
  }

  async oylikHisobot() {
    this.logger.log('Oylik hisobot yuborilmoqda...');
    const matn = await this.oylikMatnYaratish();
    await this.adminGaYuborish(matn);
  }

  // ─── Kunlik matn ─────────────────────────────────────────────
  async kunlikMatnYaratish(): Promise<string> {
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const ertasi = new Date(bugun);
    ertasi.setDate(ertasi.getDate() + 1);

    const fikrlar = await this.feedbackRepo.find({
      where: { createdAt: Between(bugun, ertasi) },
    });

    const sana = bugun.toLocaleDateString('uz-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    if (fikrlar.length === 0) {
      return (
        `📊 <b>KUNLIK HISOBOT</b>\n` +
        `📅 ${sana} — 🏛 Marvarid Restaurant\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📭 Bugun hech qanday fikr qoldirilmadi.`
      );
    }

    const jami = fikrlar.length;
    const ortacha = fikrlar.reduce((s, f) => s + f.rating, 0) / jami;
    const qoniqarli = fikrlar.filter((f) => f.rating >= 4).length;
    const pastSoni = fikrlar.filter((f) => f.rating <= 3).length;
    const foiz = Math.round((qoniqarli / jami) * 100);

    const counts = [1, 2, 3, 4, 5].map((r) => fikrlar.filter((f) => f.rating === r).length);

    // Kategoriyalar
    const kategoriyalar = [
      { key: 'taom', nom: '🍽 Taom   ' },
      { key: 'xizmat', nom: '👨‍🍳 Xizmat' },
      { key: 'muhit', nom: '🏠 Muhit  ' },
      { key: 'narx', nom: '💰 Narx   ' },
    ].map(({ key, nom }) => {
      const k = fikrlar.filter((f) => f.category === key);
      if (k.length === 0) return null;
      const or = (k.reduce((s, f) => s + f.rating, 0) / k.length).toFixed(1);
      return `${nom}  ⭐ <b>${or}</b>  (${k.length} ta)`;
    }).filter(Boolean);

    // Bugungi eng yaxshi xodim
    const bugunXodim = xodimReyting(fikrlar);

    let xabar =
      `📊 <b>KUNLIK HISOBOT</b>\n` +
      `📅 <b>${sana}</b> — 🏛 Marvarid Restaurant\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +

      `${yulduzKorsatish(ortacha)}  <b>${ortacha.toFixed(1)} / 5.0</b>\n\n` +

      `📝 Jami fikrlar: <b>${jami} ta</b>\n` +
      `✅ Qoniqarli (4-5⭐): <b>${qoniqarli} ta — ${foiz}%</b>\n` +
      `⚠️ Past baholar (1-3⭐): <b>${pastSoni} ta</b>\n\n` +

      `📈 <b>Baholar taqsimoti:</b>\n` +
      `<code>` +
      `5⭐  ${bar(counts[4], jami)}  ${counts[4]} ta\n` +
      `4⭐  ${bar(counts[3], jami)}  ${counts[3]} ta\n` +
      `3⭐  ${bar(counts[2], jami)}  ${counts[2]} ta\n` +
      `2⭐  ${bar(counts[1], jami)}  ${counts[1]} ta\n` +
      `1⭐  ${bar(counts[0], jami)}  ${counts[0]} ta` +
      `</code>`;

    if (kategoriyalar.length > 0) {
      xabar += `\n\n📂 <b>Kategoriyalar:</b>\n<code>${kategoriyalar.join('\n')}</code>`;
    }

    // Eng yaxshi xodim bloki
    if (bugunXodim.length > 0) {
      const birinchi = bugunXodim[0];
      xabar +=
        `\n\n🌟 <b>BUGUNGI ENG YAXSHI XODIM</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏆 <b>${esc(birinchi.ismi)}</b>\n` +
        `   ⭐ <b>${birinchi.ortacha.toFixed(1)}</b> / 5.0` +
        `  |  ${birinchi.soni} ta baho` +
        `  |  ${birinchi.ijobiy}% ijobiy`;
    }

    // Past baholar izohlari
    const pastlar = fikrlar.filter((f) => f.rating <= 3 && f.comment).slice(0, 5);
    if (pastlar.length > 0) {
      xabar += `\n\n⚠️ <b>Diqqat talab qiluvchi sharhlar:</b>`;
      pastlar.forEach((f, i) => {
        const kim = f.waiterName
          ? `👨‍🍳 <b>${esc(f.waiterName)}</b>`
          : `🍽 <b>Taom</b>`;
        xabar +=
          `\n${i + 1}. ${kim} — ${'⭐'.repeat(f.rating)}\n` +
          `    💬 <i>${esc(f.comment!.substring(0, 100))}</i>`;
      });
    }

    return xabar;
  }

  // ─── Oylik matn ──────────────────────────────────────────────
  async oylikMatnYaratish(): Promise<string> {
    const bugun = new Date();
    const oyBoshi = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
    const oyOxiri = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0, 23, 59, 59);

    const fikrlar = await this.feedbackRepo.find({
      where: { createdAt: Between(oyBoshi, oyOxiri) },
    });

    const oyNomi = bugun.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });

    if (fikrlar.length === 0) {
      return (
        `📅 <b>OYLIK HISOBOT</b>\n` +
        `🗓 ${oyNomi} — 🏛 Marvarid Restaurant\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📭 Bu oy hech qanday fikr qoldirilmadi.`
      );
    }

    const jami = fikrlar.length;
    const ortacha = fikrlar.reduce((s, f) => s + f.rating, 0) / jami;
    const qoniqarli = fikrlar.filter((f) => f.rating >= 4).length;
    const pastSoni = fikrlar.filter((f) => f.rating <= 3).length;
    const foiz = Math.round((qoniqarli / jami) * 100);

    const counts = [1, 2, 3, 4, 5].map((r) => fikrlar.filter((f) => f.rating === r).length);

    const kategoriyalar = [
      { key: 'taom', nom: '🍽 Taom   ' },
      { key: 'xizmat', nom: '👨‍🍳 Xizmat' },
      { key: 'muhit', nom: '🏠 Muhit  ' },
      { key: 'narx', nom: '💰 Narx   ' },
    ].map(({ key, nom }) => {
      const k = fikrlar.filter((f) => f.category === key);
      if (k.length === 0) return null;
      const or = (k.reduce((s, f) => s + f.rating, 0) / k.length).toFixed(1);
      return `${nom}  ⭐ <b>${or}</b>  (${k.length} ta)`;
    }).filter(Boolean);

    // Xodimlar reytingi
    const xodimlar = xodimReyting(fikrlar);

    let xabar =
      `📅 <b>OYLIK HISOBOT</b>\n` +
      `🗓 <b>${oyNomi}</b> — 🏛 Marvarid Restaurant\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +

      `${yulduzKorsatish(ortacha)}  <b>${ortacha.toFixed(1)} / 5.0</b>\n\n` +

      `📝 Jami fikrlar: <b>${jami} ta</b>\n` +
      `✅ Qoniqarli (4-5⭐): <b>${qoniqarli} ta — ${foiz}%</b>\n` +
      `⚠️ Past baholar (1-3⭐): <b>${pastSoni} ta</b>\n\n` +

      `📈 <b>Baholar taqsimoti:</b>\n` +
      `<code>` +
      `5⭐  ${bar(counts[4], jami)}  ${counts[4]} ta\n` +
      `4⭐  ${bar(counts[3], jami)}  ${counts[3]} ta\n` +
      `3⭐  ${bar(counts[2], jami)}  ${counts[2]} ta\n` +
      `2⭐  ${bar(counts[1], jami)}  ${counts[1]} ta\n` +
      `1⭐  ${bar(counts[0], jami)}  ${counts[0]} ta` +
      `</code>`;

    if (kategoriyalar.length > 0) {
      xabar += `\n\n📂 <b>Kategoriyalar bo'yicha:</b>\n<code>${kategoriyalar.join('\n')}</code>`;
    }

    // Xodimlar reytingi
    if (xodimlar.length > 0) {
      xabar += `\n\n👨‍🍳 <b>XODIMLAR REYTINGI</b>\n`;
      xabar += `<i>Oylik bonus hisoblash uchun</i>\n`;
      xabar += `━━━━━━━━━━━━━━━━━━━━\n`;

      xodimlar.forEach((x, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const bonus =
          x.ortacha >= 4.5 ? '💰 Bonus — tavsiya etiladi!' :
          x.ortacha >= 4.0 ? '👍 Yaxshi natija' :
          x.ortacha >= 3.0 ? '⚠️ Yaxshilash kerak' :
                              '❌ E\'tibor bering';

        xabar +=
          `\n${medal} <b>${esc(x.ismi)}</b>\n` +
          `   ${yulduzKorsatish(x.ortacha)} <b>${x.ortacha.toFixed(1)}</b>\n` +
          `   📊 ${x.soni} ta baho  |  ✅ ${x.ijobiy}% ijobiy\n` +
          `   ${bonus}\n`;
      });

      // Oyning eng yaxshisi alohida ajratilsin
      const eng = xodimlar[0];
      xabar +=
        `\n🏆 <b>OY CHAMPIONI: ${esc(eng.ismi)}</b>\n` +
        `   ⭐ ${eng.ortacha.toFixed(1)} baho — ${eng.soni} ta sharh`;
    }

    // Past baholar izohlari
    const pastlar = fikrlar.filter((f) => f.rating <= 3 && f.comment).slice(0, 5);
    if (pastlar.length > 0) {
      xabar += `\n\n⚠️ <b>Diqqat talab qiluvchi sharhlar:</b>`;
      pastlar.forEach((f, i) => {
        const kim = f.waiterName
          ? `👨‍🍳 <b>${esc(f.waiterName)}</b>`
          : `🍽 <b>Taom</b>`;
        xabar +=
          `\n${i + 1}. ${kim} — ${'⭐'.repeat(f.rating)}\n` +
          `    💬 <i>${esc(f.comment!.substring(0, 100))}</i>`;
      });
    }

    return xabar;
  }

  private async adminGaYuborish(xabar: string) {
    const adminId = this.configService.get<number>('bot.adminTelegramId');
    if (!adminId || !this.botService.bot) {
      this.logger.warn('Admin Telegram ID yoki bot topilmadi');
      return;
    }
    try {
      await this.botService.bot.telegram.sendMessage(String(adminId), xabar, {
        parse_mode: 'HTML',
      });
    } catch (err: any) {
      this.logger.error('Hisobot yuborishda xato: ' + err?.message);
      try {
        const oddiy = xabar.replace(/<[^>]*>/g, '');
        await this.botService.bot.telegram.sendMessage(String(adminId), oddiy);
      } catch {
        this.logger.error('Oddiy matn sifatida ham yuborib bo\'lmadi');
      }
    }
  }
}

// ─── Yordamchi funksiyalar ────────────────────────────────────

interface XodimStat {
  ismi: string;
  ortacha: number;
  soni: number;
  ijobiy: number;
}

function xodimReyting(fikrlar: Feedback[]): XodimStat[] {
  const xizmat = fikrlar.filter((f) => f.category === 'xizmat' && f.waiterName);
  if (xizmat.length === 0) return [];

  const map = new Map<string, { jami: number; soni: number; past: number }>();
  xizmat.forEach((f) => {
    const ismi = f.waiterName!.trim();
    const d = map.get(ismi) || { jami: 0, soni: 0, past: 0 };
    map.set(ismi, {
      jami: d.jami + f.rating,
      soni: d.soni + 1,
      past: d.past + (f.rating <= 3 ? 1 : 0),
    });
  });

  return Array.from(map.entries())
    .map(([ismi, { jami, soni, past }]) => ({
      ismi,
      ortacha: jami / soni,
      soni,
      ijobiy: Math.round(((soni - past) / soni) * 100),
    }))
    .sort((a, b) => b.ortacha - a.ortacha || b.soni - a.soni);
}

function yulduzKorsatish(ortacha: number): string {
  const toliq = Math.floor(ortacha);
  const yarim = ortacha - toliq >= 0.5;
  const bosh = 5 - toliq - (yarim ? 1 : 0);
  return '★'.repeat(toliq) + (yarim ? '½' : '') + '☆'.repeat(bosh);
}

function bar(soni: number, jami: number): string {
  const n = jami > 0 ? Math.round((soni / jami) * 10) : 0;
  return '█'.repeat(n) + '░'.repeat(10 - n);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
  ) {}

  @Cron('30 23 * * *', { timeZone: 'Asia/Tashkent' })
  async kunlikHisobot() {
    this.logger.log('Kunlik hisobot yuborilmoqda...');
    const matn = await this.kunlikMatnYaratish();
    await this.adminGaYuborish(matn);
  }

  async oylikHisobot() {
    this.logger.log('Oylik hisobot yuborilmoqda...');
    const matn = await this.oylikMatnYaratish();
    await this.adminGaYuborish(matn);
  }

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
        `📊 <b>Kunlik hisobot</b>\n\n` +
        `📅 ${sana}  ·  Marvarid Restaurant\n\n` +
        `📭 Bugun hech qanday fikr qoldirilmadi.`
      );
    }

    const jami = fikrlar.length;
    const ortacha = fikrlar.reduce((s, f) => s + f.rating, 0) / jami;
    const qoniqarli = fikrlar.filter((f) => f.rating >= 4).length;
    const pastSoni = fikrlar.filter((f) => f.rating <= 3).length;
    const foiz = Math.round((qoniqarli / jami) * 100);
    const counts = [1, 2, 3, 4, 5].map((r) => fikrlar.filter((f) => f.rating === r).length);

    const kategoriyalar = [
      { key: 'taom',   nom: '🍽 Taom    ' },
      { key: 'xizmat', nom: '👨‍🍳 Xizmat ' },
      { key: 'muhit',  nom: '🏠 Muhit   ' },
      { key: 'narx',   nom: '💰 Narx    ' },
    ].map(({ key, nom }) => {
      const k = fikrlar.filter((f) => f.category === key);
      if (k.length === 0) return null;
      const or = (k.reduce((s, f) => s + f.rating, 0) / k.length).toFixed(1);
      return `${nom}  ⭐ <b>${or}</b>  (${k.length} ta)`;
    }).filter(Boolean);

    const bugunXodim = xodimReyting(fikrlar);

    let xabar =
      `📊 <b>Kunlik hisobot</b>\n\n` +
      `📅 <b>${sana}</b>  ·  Marvarid Restaurant\n\n` +
      `${yulduzKorsatish(ortacha)}  <b>${ortacha.toFixed(1)} / 5.0</b>\n\n` +
      `📝 Jami:  <b>${jami} ta</b>\n` +
      `✅ Yaxshi (4-5⭐):  <b>${qoniqarli} ta — ${foiz}%</b>\n` +
      `⚠️ Past (1-3⭐):  <b>${pastSoni} ta</b>\n\n` +
      `📈 <b>Taqsimot:</b>\n` +
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

    if (bugunXodim.length > 0) {
      const birinchi = bugunXodim[0];
      xabar +=
        `\n\n🌟 <b>Bugungi eng yaxshi xodim</b>\n\n` +
        `🏆 <b>${esc(birinchi.ismi)}</b>\n` +
        `   ⭐ <b>${birinchi.ortacha.toFixed(1)}</b> / 5.0` +
        `  ·  ${birinchi.soni} ta baho` +
        `  ·  ${birinchi.ijobiy}% ijobiy`;
    }

    const pastlar = fikrlar.filter((f) => f.rating <= 3 && f.comment).slice(0, 5);
    if (pastlar.length > 0) {
      xabar += `\n\n⚠️ <b>Diqqat talab qiluvchi sharhlar:</b>`;
      pastlar.forEach((f, i) => {
        const kim = f.waiterName
          ? `👨‍🍳 <b>${esc(f.waiterName)}</b>`
          : `🍽 <b>Taom</b>`;
        xabar +=
          `\n\n${i + 1}. ${kim}  ${'⭐'.repeat(f.rating)}\n` +
          `    💬 <i>${esc(f.comment!.substring(0, 100))}</i>`;
      });
    }

    return xabar;
  }

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
        `📅 <b>Oylik hisobot</b>\n\n` +
        `🗓 ${oyNomi}  ·  Marvarid Restaurant\n\n` +
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
      { key: 'taom',   nom: '🍽 Taom    ' },
      { key: 'xizmat', nom: '👨‍🍳 Xizmat ' },
      { key: 'muhit',  nom: '🏠 Muhit   ' },
      { key: 'narx',   nom: '💰 Narx    ' },
    ].map(({ key, nom }) => {
      const k = fikrlar.filter((f) => f.category === key);
      if (k.length === 0) return null;
      const or = (k.reduce((s, f) => s + f.rating, 0) / k.length).toFixed(1);
      return `${nom}  ⭐ <b>${or}</b>  (${k.length} ta)`;
    }).filter(Boolean);

    const xodimlar = xodimReyting(fikrlar);

    let xabar =
      `📅 <b>Oylik hisobot</b>\n\n` +
      `🗓 <b>${oyNomi}</b>  ·  Marvarid Restaurant\n\n` +
      `${yulduzKorsatish(ortacha)}  <b>${ortacha.toFixed(1)} / 5.0</b>\n\n` +
      `📝 Jami:  <b>${jami} ta</b>\n` +
      `✅ Yaxshi (4-5⭐):  <b>${qoniqarli} ta — ${foiz}%</b>\n` +
      `⚠️ Past (1-3⭐):  <b>${pastSoni} ta</b>\n\n` +
      `📈 <b>Taqsimot:</b>\n` +
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

    // Xodimlar reytingi va bonus tizimi
    if (xodimlar.length > 0) {
      xabar += `\n\n👨‍🍳 <b>Xodimlar reytingi</b>\n`;

      xodimlar.forEach((x, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const { daraja } = bonusDaraja(x.ortacha, x.ijobiy);

        xabar +=
          `\n${medal} <b>${esc(x.ismi)}</b>\n` +
          `   ${yulduzKorsatish(x.ortacha)}  <b>${x.ortacha.toFixed(1)}</b> / 5.0\n` +
          `   📊 ${x.soni} ta baho  ·  ✅ ${x.ijobiy}% ijobiy\n` +
          `   ${daraja}\n`;
      });

      // Bonus g'olibi kartasi
      const eng = xodimlar[0];
      const { emoji, bonus } = bonusDaraja(eng.ortacha, eng.ijobiy);

      xabar +=
        `\n\n${emoji} <b>${oyNomi.toUpperCase()} — OY G'OLIBI</b>\n\n` +
        `🏆 <b>${esc(eng.ismi)}</b>\n` +
        `   ⭐ <b>${eng.ortacha.toFixed(1)} / 5.0</b>\n` +
        `   📊 ${eng.soni} ta baho  ·  ${eng.ijobiy}% ijobiy\n\n` +
        `${bonus}`;
    }

    const pastlar = fikrlar.filter((f) => f.rating <= 3 && f.comment).slice(0, 5);
    if (pastlar.length > 0) {
      xabar += `\n\n⚠️ <b>Diqqat talab qiluvchi sharhlar:</b>`;
      pastlar.forEach((f, i) => {
        const kim = f.waiterName
          ? `👨‍🍳 <b>${esc(f.waiterName)}</b>`
          : `🍽 <b>Taom</b>`;
        xabar +=
          `\n\n${i + 1}. ${kim}  ${'⭐'.repeat(f.rating)}\n` +
          `    💬 <i>${esc(f.comment!.substring(0, 100))}</i>`;
      });
    }

    return xabar;
  }

  private async adminGaYuborish(xabar: string) {
    const rawIds = process.env.ADMIN_TELEGRAM_IDS || process.env.ADMIN_TELEGRAM_ID || '';
    const adminIds: number[] = rawIds
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => n > 0);
    if (adminIds.length === 0 || !this.botService.bot) {
      this.logger.warn('Admin ID yoki bot topilmadi');
      return;
    }
    for (const adminId of adminIds) {
      try {
        await this.botService.bot.telegram.sendMessage(String(adminId), xabar, {
          parse_mode: 'HTML',
        });
      } catch (err: any) {
        this.logger.error(`Hisobot ${adminId} ga yuborishda xato: ` + err?.message);
        try {
          const oddiy = xabar.replace(/<[^>]*>/g, '');
          await this.botService.bot.telegram.sendMessage(String(adminId), oddiy);
        } catch {
          this.logger.error(`Oddiy matn sifatida ham ${adminId} ga yuborib bo\'lmadi`);
        }
      }
    }
  }
}

interface XodimStat {
  ismi: string;
  ortacha: number;
  soni: number;
  ijobiy: number;
}

function bonusDaraja(ortacha: number, ijobiy: number): { emoji: string; daraja: string; bonus: string } {
  if (ortacha >= 4.5 && ijobiy >= 85) {
    return {
      emoji: '🏅',
      daraja: '💰 Bonus — tavsiya etiladi!',
      bonus:
        `💰 <b>BONUS BERILSIN!</b>\n` +
        `<i>Oy davomida a'lo darajada ishladi.\n` +
        `Mehmonlar undan juda mamnun!</i>`,
    };
  }
  if (ortacha >= 4.0 && ijobiy >= 70) {
    return {
      emoji: '🌟',
      daraja: '👍 Yaxshi natija',
      bonus:
        `👍 <b>YAXSHI ISHLADI</b>\n` +
        `<i>Oy natijasi yaxshi. Bonus qaror qabul\n` +
        `qiluvchiga havola etiladi.</i>`,
    };
  }
  if (ortacha >= 3.0) {
    return {
      emoji: '📊',
      daraja: '⚠️ Yaxshilash kerak',
      bonus:
        `⚠️ <b>YAXSHILASH KERAK</b>\n` +
        `<i>Natija o'rtacha. Keyingi oy\n` +
        `yaxshiroq harakat qilsin.</i>`,
    };
  }
  return {
    emoji: '📉',
    daraja: '❌ E\'tibor bering',
    bonus:
      `❌ <b>E'TIBOR BERING</b>\n` +
      `<i>Past natija. Xodim bilan\n` +
      `alohida suhbat o'tkazish tavsiya etiladi.</i>`,
  };
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

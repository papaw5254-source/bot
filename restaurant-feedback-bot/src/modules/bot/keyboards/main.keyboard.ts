import { Markup } from 'telegraf';

export const asosiyKlavyatura = () =>
  Markup.keyboard([
    ['⭐ Baholash', '📋 Mening baholarim'],
    ['📞 Aloqa'],
  ])
    .resize()
    .persistent();

export const adminKlavyaturasi = () =>
  Markup.keyboard([
    ['⭐ Baholash', '📋 Mening baholarim'],
    ['📞 Aloqa'],
    ['📊 Kunlik hisobot', '📅 Oylik hisobot'],
  ])
    .resize()
    .persistent();

export const reytingKlavyaturasi = () =>
  Markup.keyboard([
    ['⭐ 1', '⭐⭐ 2', '⭐⭐⭐ 3'],
    ['⭐⭐⭐⭐ 4', '⭐⭐⭐⭐⭐ 5'],
    ['❌ Bekor qilish'],
  ]).resize();

export const xodimlarKlavyaturasi = () =>
  Markup.keyboard([
    ['👩‍💼 Administrator — Xalima'],
    ['👨‍🍳 Ofitsiant — Amirxon', '👨‍🍳 Ofitsiant — Dilafruz'],
    ['👨‍🍳 Ofitsiant — Ortiqboy', '👨‍🍳 Ofitsiant — Mansur'],
    ['👨‍🍳 Ofitsiant — Yusufboy'],
    ['🍽 Taom sifati'],
    ['❌ Bekor qilish'],
  ]).resize();

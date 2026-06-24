import { Markup } from 'telegraf';

export const asosiyKlavyatura = () =>
  Markup.keyboard([
    ['⭐ Baholash', '📋 Mening baholarim'],
    ['📞 Aloqa'],
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
    ['👨‍🍳 Amirxon', '👨‍🍳 Yusufboy'],
    ['👨‍🍳 Ortiqvoy', '👩‍💼 Xalima'],
    ['🍽 Taom sifati'],
    ['❌ Bekor qilish'],
  ]).resize();

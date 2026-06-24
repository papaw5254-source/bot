import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'restaurant_feedback',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('✅ Database ulandi');

  const adminRepo = dataSource.getRepository('admins');
  const restaurantRepo = dataSource.getRepository('restaurants');

  const mavjudAdmin = await adminRepo.findOne({ where: { username: 'superadmin' } });
  if (!mavjudAdmin) {
    const passwordHash = await bcrypt.hash('Admin@2024!', 10);
    await adminRepo.save({
      username: 'superadmin',
      passwordHash,
      fullName: 'Super Admin',
      role: 'super_admin',
      telegramId: parseInt(process.env.ADMIN_TELEGRAM_ID || '0'),
      isActive: true,
    });
    console.log('✅ Superadmin yaratildi: login=superadmin, parol=Admin@2024!');
  } else {
    console.log('ℹ️  Superadmin allaqachon mavjud');
  }

  const mavjudRestoran = await restaurantRepo.findOne({ where: { name: 'Marvarid Restaurant' } });
  if (!mavjudRestoran) {
    await restaurantRepo.save({
      name: 'Marvarid Restaurant',
      description: 'Milliy taomlar va zamonaviy menyular',
      address: 'Toshkent shahri',
      phone: '+998901234567',
      isActive: true,
    });
    console.log('✅ Namunali restoran yaratildi: Marvarid Restaurant');
  } else {
    console.log('ℹ️  Restoran allaqachon mavjud');
  }

  await dataSource.destroy();
  console.log('\n🎉 Seed muvaffaqiyatli yakunlandi!');
}

seed().catch((err) => {
  console.error('❌ Seed xatosi:', err);
  process.exit(1);
});

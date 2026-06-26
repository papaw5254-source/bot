import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { execSync } from 'child_process';

const logger = new Logger('Bootstrap');

// DB ulanish manbasi: DATABASE_URL > individual vars
logger.log('DB: ' + (process.env.DATABASE_URL ? 'DATABASE_URL mavjud' : 'localhost fallback'));

function portniTozala(port: number) {
  try {
    const natija = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    natija.split('\n').forEach((qator) => {
      const qismlar = qator.trim().split(/\s+/);
      if (qismlar[1]?.endsWith(`:${port}`) && qismlar[3] === 'LISTENING') {
        const pid = qismlar[4];
        if (pid && pid !== '0') {
          try {
            execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf8' });
            logger.log(`Port ${port} bo'shatildi (PID: ${pid})`);
          } catch { /* allaqachon o'chgan */ }
        }
      }
    });
  } catch { /* port band emas */ }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restoran Feedback Bot API')
    .setDescription(
      'Telegram orqali restoran fikr-mulohazalarini boshqarish tizimi',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Adminlar', 'Admin boshqaruvi')
    .addTag('Restoranlar', 'Restoran boshqaruvi')
    .addTag('Fikr-mulohazalar', 'Fikr boshqaruvi')
    .addTag('Foydalanuvchilar', 'Foydalanuvchi boshqaruvi')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });

  const port = parseInt(process.env.APP_PORT || '3000', 10);

  portniTozala(port);

  await app.listen(port);
  logger.log(`Ilova ishga tushdi: http://localhost:${port}`);
  logger.log(`Swagger hujjati: http://localhost:${port}/api/docs`);
  logger.log(`Telegram bot polling rejimida ishlamoqda`);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

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

  try {
    await app.listen(port);
    logger.log(`Ilova ishga tushdi: http://localhost:${port}`);
    logger.log(`Swagger hujjati: http://localhost:${port}/api/docs`);
    logger.log(`Telegram bot polling rejimida ishlamoqda`);
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} allaqachon ishlatilmoqda!\n` +
        `Eski jarayonni o'chirish uchun:\n` +
        `  Windows: netstat -ano | findstr :${port}  →  taskkill /PID <pid> /F\n` +
        `  yoki boshqa port tanlang: APP_PORT=3001 npm run start:dev`,
      );
    } else {
      logger.error('Ilovani ishga tushirishda xato:', error.message);
    }
    process.exit(1);
  }
}

bootstrap();

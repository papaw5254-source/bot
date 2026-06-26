import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD, Reflector } from '@nestjs/core';
import { AppController } from './app.controller';

import jwtConfig from './config/jwt.config';
import botConfig from './config/bot.config';

import { UserModule } from './modules/user/user.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AdminModule } from './modules/admin/admin.module';
import { BotModule } from './modules/bot/bot.module';
import { ReportModule } from './modules/report/report.module';

import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

function dbConfig(): TypeOrmModuleOptions {
  const isProd = process.env.NODE_ENV === 'production';
  const ssl = isProd ? { rejectUnauthorized: false } : false;
  const entities = [__dirname + '/**/*.entity{.ts,.js}'];

  const rawUrl = process.env.DATABASE_URL;
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      return {
        type: 'postgres',
        host: u.hostname,
        port: parseInt(u.port || '5432', 10),
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, ''),
        entities,
        synchronize: true,
        logging: false,
        ssl,
      };
    } catch { /* URL parse failed, fallback */ }
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'marvarid_restaurant',
    entities,
    synchronize: true,
    logging: false,
    ssl,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, botConfig],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(dbConfig()),
    UserModule,
    RestaurantModule,
    FeedbackModule,
    AdminModule,
    BotModule,
    ReportModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
      inject: [Reflector],
    },
  ],
  controllers: [AppController],
})
export class AppModule {}

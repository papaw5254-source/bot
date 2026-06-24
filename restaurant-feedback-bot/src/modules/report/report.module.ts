import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '../feedback/entities/feedback.entity';
import { ReportService } from './report.service';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback]), forwardRef(() => BotModule)],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}

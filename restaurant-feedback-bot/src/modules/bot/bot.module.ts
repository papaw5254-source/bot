import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { UserModule } from '../user/user.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { ReportModule } from '../report/report.module';
import { RestaurantModule } from '../restaurant/restaurant.module';

@Module({
  imports: [UserModule, FeedbackModule, RestaurantModule, forwardRef(() => ReportModule)],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}

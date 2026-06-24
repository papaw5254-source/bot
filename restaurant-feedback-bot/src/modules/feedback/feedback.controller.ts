import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import {
  UpdateFeedbackStatusDto,
  CreateFeedbackReplyDto,
  FeedbackFilterDto,
} from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';

@ApiTags('Fikr-mulohazalar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha fikrlarni olish (filtr bilan)' })
  @ApiQuery({ name: 'restaurantId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minRating', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  barchasiniOlish(@Query() filter: FeedbackFilterDto) {
    return this.feedbackService.barchasiniTopish(filter);
  }

  @Get('statistika')
  @ApiOperation({ summary: 'Fikrlar statistikasi' })
  @ApiQuery({ name: 'restaurantId', required: false })
  statistika(@Query('restaurantId') restaurantId?: number) {
    return this.feedbackService.statistika(restaurantId ? +restaurantId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta fikrni olish' })
  bitta(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.idByTopish(id);
  }

  @Patch(':id/holat')
  @ApiOperation({ summary: 'Fikr holatini yangilash' })
  holatYangilash(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbackService.holatYangilash(id, dto);
  }

  @Post(':id/javob')
  @ApiOperation({ summary: 'Fikrga javob berish' })
  javobBerish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFeedbackReplyDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.feedbackService.javobBerish(id, admin.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Fikrni o\'chirish' })
  ochirish(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.ochirish(id);
  }
}

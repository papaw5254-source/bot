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
import { RestaurantService } from './restaurant.service';
import {
  CreateRestaurantDto,
  UpdateRestaurantDto,
} from './dto/create-restaurant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Restoranlar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi restoran qo\'shish' })
  yaratish(@Body() dto: CreateRestaurantDto) {
    return this.restaurantService.yaratish(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Barcha restoranlarni olish' })
  @ApiQuery({ name: 'faqatFaol', required: false, type: Boolean })
  barchasiniOlish(@Query('faqatFaol') faqatFaol?: string) {
    return this.restaurantService.barchasiniTopish(faqatFaol === 'true');
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Restoran ma\'lumotlarini olish' })
  bitta(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.idByTopish(id);
  }

  @Get(':id/statistika')
  @ApiOperation({ summary: 'Restoran statistikasini olish' })
  statistika(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.statistikaTopish(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Restoran ma\'lumotlarini yangilash' })
  yangilash(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.yangilash(id, dto);
  }

  @Patch(':id/holat')
  @ApiOperation({ summary: 'Restoranni faollashtirish/o\'chirish' })
  faollashtirish(
    @Param('id', ParseIntPipe) id: number,
    @Body('holat') holat: boolean,
  ) {
    return this.restaurantService.faollashtirish(id, holat);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restoranni o\'chirish' })
  ochirish(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantService.ochirish(id);
  }
}

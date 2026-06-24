import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Foydalanuvchilar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha foydalanuvchilarni olish' })
  @ApiQuery({ name: 'sahifa', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async barchasiniOlish(
    @Query('sahifa') sahifa = 1,
    @Query('limit') limit = 20,
  ) {
    const [malumot, jami] = await this.userService.barchasiniTopish(
      +sahifa,
      +limit,
    );
    return { malumot, jami, sahifa: +sahifa, limit: +limit };
  }

  @Get('statistika')
  @ApiOperation({ summary: 'Foydalanuvchilar statistikasi' })
  statistika() {
    return this.userService.statistika();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha foydalanuvchini olish' })
  bitta(@Param('id', ParseIntPipe) id: number) {
    return this.userService.idByTopish(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Foydalanuvchini yangilash' })
  yangilash(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.yangilash(id, dto);
  }

  @Patch(':id/blok')
  @ApiOperation({ summary: 'Foydalanuvchini bloklash/blokdan chiqarish' })
  bloklash(
    @Param('id', ParseIntPipe) id: number,
    @Body('holat') holat: boolean,
  ) {
    return this.userService.bloklash(id, holat);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto, LoginAdminDto, UpdateAdminDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Adminlar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('kirish')
  @Public()
  @ApiOperation({ summary: 'Admin tizimga kirish' })
  kirish(@Body() dto: LoginAdminDto) {
    return this.adminService.kirish(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi admin yaratish' })
  yaratish(@Body() dto: CreateAdminDto) {
    return this.adminService.yaratish(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha adminlarni ko\'rish' })
  barchasiniOlish() {
    return this.adminService.barchasiniTopish();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin ma\'lumotlarini olish' })
  bitta(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.idByTopish(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin ma\'lumotlarini yangilash' })
  yangilash(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminService.yangilash(id, dto);
  }

  @Patch(':id/holat')
  @ApiOperation({ summary: 'Adminni faollashtirish/o\'chirish' })
  faollashtirish(
    @Param('id', ParseIntPipe) id: number,
    @Body('holat') holat: boolean,
  ) {
    return this.adminService.faollashtirish(id, holat);
  }
}

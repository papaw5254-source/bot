import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Asosiy')
@Controller()
export class AppController {
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Tizim holati' })
  health(): object {
    return {
      holat: 'ishlayapti',
      vaqt: new Date().toISOString(),
      versiya: '1.0.0',
    };
  }
}

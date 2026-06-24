import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsNumber,
} from 'class-validator';
import { AdminRole } from '../entities/admin.entity';

export class CreateAdminDto {
  @ApiProperty({ description: 'Login' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Parol (kamida 8 belgi)', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'To\'liq ism' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ enum: AdminRole })
  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;

  @ApiPropertyOptional({ description: 'Restoran ID (restoran admin uchun)' })
  @IsNumber()
  @IsOptional()
  restaurantId?: number;

  @ApiPropertyOptional({ description: 'Telegram ID' })
  @IsNumber()
  @IsOptional()
  telegramId?: number;
}

export class LoginAdminDto {
  @ApiProperty({ description: 'Login' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Parol' })
  @IsString()
  password: string;
}

export class UpdateAdminDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  restaurantId?: number;
}

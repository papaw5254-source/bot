import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Telegram foydalanuvchi ID' })
  @IsNumber()
  telegramId: number;

  @ApiPropertyOptional({ description: 'Telegram username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'Ism' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'Familiya' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Telefon raqam' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Til', default: 'uz' })
  @IsString()
  @IsOptional()
  language?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;
}

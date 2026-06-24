import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { FeedbackCategory, FeedbackStatus } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Foydalanuvchi ID' })
  @IsNumber()
  userId: number;

  @ApiProperty({ description: 'Restoran ID' })
  @IsNumber()
  restaurantId: number;

  @ApiProperty({ description: 'Reyting (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Izoh' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ enum: FeedbackCategory, description: 'Kategoriya' })
  @IsEnum(FeedbackCategory)
  @IsOptional()
  category?: FeedbackCategory;

  @ApiPropertyOptional({ description: 'Ofitsiant ismi (Xizmat kategoriyasi uchun)' })
  @IsString()
  @IsOptional()
  waiterName?: string;

  @ApiPropertyOptional({ description: 'Rasm URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: FeedbackStatus, description: 'Yangi holat' })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;
}

export class CreateFeedbackReplyDto {
  @ApiProperty({ description: 'Javob matni' })
  @IsString()
  message: string;
}

export class FeedbackFilterDto {
  @ApiPropertyOptional({ description: 'Restoran ID' })
  @IsNumber()
  @IsOptional()
  restaurantId?: number;

  @ApiPropertyOptional({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @ApiPropertyOptional({ enum: FeedbackCategory })
  @IsEnum(FeedbackCategory)
  @IsOptional()
  category?: FeedbackCategory;

  @ApiPropertyOptional({ description: 'Minimal reyting', minimum: 1 })
  @IsNumber()
  @IsOptional()
  minRating?: number;

  @ApiPropertyOptional({ description: 'Sahifa raqami', default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Sahifadagi elementlar soni', default: 10 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

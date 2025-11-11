import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class FilterTemplatesDto {
  @ApiProperty({
    example: 'email',
    description: 'Filter by template type',
    enum: ['email', 'push'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['email', 'push'])
  type?: string;

  @ApiProperty({
    example: 'en',
    description: 'Filter by language',
    enum: ['en', 'es', 'fr', 'de'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de'])
  language?: string;

  @ApiProperty({
    example: true,
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    example: 1,
    description: 'Page number',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

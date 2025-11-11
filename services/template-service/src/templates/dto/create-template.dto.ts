import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    example: 'welcome-email',
    description: 'Unique template name (kebab-case)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'email',
    description: 'Template type',
    enum: ['email', 'push'],
  })
  @IsString()
  @IsIn(['email', 'push'])
  type: string;

  @ApiProperty({
    example: 'Welcome to {{app_name}}!',
    description: 'Email subject (required for email templates)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    example: 'Hello {{user_name}}, welcome to {{app_name}}! Your account has been created.',
    description: 'Template body with variables in {{variable}} format',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    example: 'en',
    description: 'Template language code',
    enum: ['en', 'es', 'fr', 'de'],
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de'])
  language?: string;

  @ApiProperty({
    example: true,
    description: 'Template active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

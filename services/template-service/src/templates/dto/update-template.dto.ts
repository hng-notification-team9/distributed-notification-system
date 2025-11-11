import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class UpdateTemplateDto {
  @ApiProperty({
    example: 'Welcome to {{app_name}}!',
    description: 'Email subject',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    example: 'Hello {{user_name}}, welcome to our platform!',
    description: 'Template body with variables',
    required: false,
  })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({
    example: true,
    description: 'Template active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiProperty({
    example: true,
    description: 'Enable/disable email notifications',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  email_notifications?: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable/disable push notifications',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  push_notifications?: boolean;

  @ApiProperty({
    example: 'instant',
    description: 'Notification frequency',
    enum: ['instant', 'daily', 'weekly'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['instant', 'daily', 'weekly'])
  notification_frequency?: string;

  @ApiProperty({
    example: 'Africa/Lagos',
    description: 'User timezone',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    example: 'en',
    description: 'Preferred language code',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;
}

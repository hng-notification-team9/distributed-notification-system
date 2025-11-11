import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreatePushTokenDto {
  @ApiProperty({
    example: 'f3d8h72k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a',
    description: 'Push notification token from device',
  })
  @IsString()
  @MaxLength(500)
  token: string;

  @ApiProperty({
    example: 'ios',
    description: 'Type of device',
    enum: ['ios', 'android', 'web'],
  })
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  device_type: string;

  @ApiProperty({
    example: 'iPhone 14 Pro',
    description: 'Name of the device',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_name?: string;
}

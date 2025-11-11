import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateVariableDto {
  @ApiProperty({
    example: 'user_name',
    description: 'Variable key (snake_case)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  variable_key: string;

  @ApiProperty({
    example: 'The name of the user receiving the notification',
    description: 'Description of what this variable represents',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Whether this variable is required for rendering',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiProperty({
    example: 'Guest',
    description: 'Default value if variable is not provided',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  default_value?: string;
}

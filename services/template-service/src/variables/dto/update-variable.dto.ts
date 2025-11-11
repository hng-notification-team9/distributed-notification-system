import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateVariableDto {
  @ApiProperty({
    example: 'The full name of the user',
    description: 'Description of the variable',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Whether this variable is required',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiProperty({
    example: 'Anonymous',
    description: 'Default value for the variable',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  default_value?: string;
}

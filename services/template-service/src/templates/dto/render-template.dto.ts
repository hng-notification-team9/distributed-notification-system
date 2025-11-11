import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class RenderTemplateDto {
  @ApiProperty({
    example: {
      user_name: 'John Doe',
      app_name: 'MyApp',
      order_id: '12345',
      verification_code: '123456',
    },
    description: 'Variables to substitute in template',
  })
  @IsObject()
  @IsNotEmpty()
  variables: Record<string, any>;
}

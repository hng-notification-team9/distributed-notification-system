import { IsEmail, IsNumber, IsString, IsUUID } from 'class-validator';
export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsUUID()
  user_id: string;
  @IsString()
  template_code: string;

  @IsString()
  request_id: string;

  @IsNumber()
  priority: number;

  variables: Record<string, any>;
}

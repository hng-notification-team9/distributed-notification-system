import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { SendEmailDto } from './Dto/email.dto';

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}
  @MessagePattern('email.queue')
  handleEmail(@Payload() message: SendEmailDto) {
    console.log(message);
    this.emailService.sendEmail(message);
    return 'Message received successfully';
  }
}

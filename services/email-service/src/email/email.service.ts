import { Injectable } from '@nestjs/common';
import { SendEmailDto } from './Dto/email.dto';
import nodemailer from 'nodemailer';
@Injectable()
export class EmailService {
  sendEmail(data: SendEmailDto) {
    console.log(`Sending email to ${data.user_id}`);
    console.log(data.template_code, data.variables);
  }
}

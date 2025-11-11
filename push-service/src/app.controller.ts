import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import {Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
   @EventPattern('test_message')
  handleTest(@Payload() data: any) {
    console.log('Received test message:', data);
}
@EventPattern('send_push')
async handlePush(@Payload() data: any, @Ctx() context: RmqContext) {
  console.log('Received:', data);
  const channel = context.getChannelRef();
  const message = context.getMessage();
  channel.ack(message);
}

}
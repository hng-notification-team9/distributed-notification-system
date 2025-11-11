import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';


@Controller()
export class PushController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'push-service' };
  }
  @EventPattern('send_push') 
   // must match the routing key
  async handlePush(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Received push:', data);
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);  // acknowledge the message
  }
}

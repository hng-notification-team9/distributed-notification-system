import { Injectable, Logger } from '@nestjs/common';
import { Payload, Ctx, RmqContext, EventPattern } from '@nestjs/microservices';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  @EventPattern('send_push')
  async handlePush(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.log(`Received push: ${JSON.stringify(data)}`);
    // ACK the message manually if needed
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);

    // Later: integrate FCM send logic here
  }
}

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PUSH_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            'RABBITMQ_URL',
          ],
          queue: 'push_queue',
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMQModule {}
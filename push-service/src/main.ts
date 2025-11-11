import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');
  if (!rabbitMqUrl) {
    throw new Error('RABBITMQ_URL is not defined in environment variables');
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://guest:guest@localhost:5672'],
      queue: 'push.queue',
      queueOptions: { durable: true },
            noAck: false,

    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
  console.log('Push Service is running...');
}
bootstrap();

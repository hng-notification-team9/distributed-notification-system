import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
      max: configService.get<number>('RATE_LIMIT_MAX', 100),
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle(configService.get<string>('API_TITLE', 'Template Service API'))
    .setDescription(
      configService.get<string>(
        'API_DESCRIPTION',
        'Distributed Notification System - Template Management Service',
      ),
    )
    .setVersion(configService.get<string>('API_VERSION', '1.0.0'))
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3004);
  await app.listen(port);

  console.log(`
    Ì∫Ä Template Service is running!
    Ì≥ù API Documentation: http://localhost:${port}/api/docs
    Ì¥ß Environment: ${configService.get<string>('NODE_ENV', 'development')}
    Ìºç Port: ${port}
  `);
}

bootstrap();

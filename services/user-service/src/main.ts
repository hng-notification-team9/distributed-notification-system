import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ✅ FIX 1: Trust proxy - Cast to 'any' to access Express methods
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  // Security: Helmet helps secure Express apps
  app.use(helmet());

  // ✅ FIX 2: Rate limiting - Remove trustProxy option if not supported
  app.use(
    rateLimit({
      windowMs: configService.get<number>("RATE_LIMIT_TTL", 60) * 1000,
      max: configService.get<number>("RATE_LIMIT_MAX", 100),
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // ✅ Enable CORS for all origins (microservices communication)
  const nodeEnv = configService.get<string>("NODE_ENV", "development");

  if (nodeEnv === "production") {
    // Production: Allow all Azure services
    app.enableCors({
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      credentials: true,
      allowedHeaders: "Content-Type,Authorization,Accept",
    });
  } else {
    // Development: Allow localhost
    app.enableCors({
      origin: configService.get<string>("CORS_ORIGIN", "http://localhost:3000"),
      credentials: true,
    });
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle(configService.get<string>("API_TITLE", "User Service API"))
    .setDescription(
      configService.get<string>(
        "API_DESCRIPTION",
        "Distributed Notification System - User Management Service"
      )
    )
    .setVersion(configService.get<string>("API_VERSION", "1.0.0"))
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth"
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("PORT", 3001);
  await app.listen(port);

  console.log(`
    🚀 User Service is running!
    📚 API Documentation: http://localhost:${port}/api/docs
    🌍 Environment: ${nodeEnv}
    🔌 Port: ${port}
  `);
}

bootstrap();

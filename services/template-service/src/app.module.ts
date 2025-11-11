import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { TemplatesModule } from './templates/templates.module';
import { VariablesModule } from './variables/variables.module';
import { VersionsModule } from './versions/versions.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    TemplatesModule,
    VariablesModule,
    VersionsModule,
    HealthModule,
  ],
})
export class AppModule {}

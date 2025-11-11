import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, PushModule],
})
export class AppModule {}

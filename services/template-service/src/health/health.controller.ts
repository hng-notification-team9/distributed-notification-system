import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  async check() {
    const startTime = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'template-service',
        version: '1.0.0',
        uptime: process.uptime(),
        database: {
          status: 'connected',
          response_time_ms: responseTime,
        },
        memory: {
          used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'template-service',
        version: '1.0.0',
        database: {
          status: 'disconnected',
          error: error.message,
        },
      };
    }
  }
}

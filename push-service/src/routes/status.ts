// src/routes/status.ts
import { FastifyInstance } from 'fastify';
import { pg, redis } from '../db/postgres';

interface StatusResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  consumer: {
    active: boolean;
    last_processed?: string;
    last_processed_at?: string;
    backlog: number;
  };
  circuit_breaker: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    last_failure?: string;
  };
  database: {
    postgres: 'connected' | 'error';
    redis: 'connected' | 'error';
  };
  version: string;
  timestamp: string;
}

// In-memory state (updated by consumer)
export const statusState = {
  consumerActive: false,
  lastProcessedId: null as string | null,
  lastProcessedAt: null as string | null,
  circuitFailures: 0,
  circuitState: 'closed' as 'closed' | 'open' | 'half-open',
};

export default async function (fastify: FastifyInstance) {
  fastify.get('/status', {
    schema: {
      tags: ['Status'],
      summary: 'Get overall service status',
      description: 'Returns the health of push service, database connections, consumer state, and circuit breaker info.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
            uptime: { type: 'integer', description: 'Process uptime in seconds' },
            consumer: {
              type: 'object',
              properties: {
                active: { type: 'boolean' },
                last_processed: { type: 'string', nullable: true },
                last_processed_at: { type: 'string', nullable: true },
                backlog: { type: 'integer' },
              },
            },
            circuit_breaker: {
              type: 'object',
              properties: {
                state: { type: 'string', enum: ['closed', 'open', 'half-open'] },
                failures: { type: 'integer' },
                last_failure: { type: 'string', nullable: true },
              },
            },
            database: {
              type: 'object',
              properties: {
                postgres: { type: 'string', enum: ['connected', 'error'] },
                redis: { type: 'string', enum: ['connected', 'error'] },
              },
            },
            version: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    const start = process.uptime();

    let pgStatus: 'connected' | 'error' = 'error';
    let redisStatus: 'connected' | 'error' = 'error';

    try { await pg.query('SELECT 1'); pgStatus = 'connected'; } catch {}
    try { await redis.ping(); redisStatus = 'connected'; } catch {}

    let backlog = 0;
    try {
      const channel = (fastify as any).rabbitChannel;
      if (channel) {
        const queue = process.env.PUSH_QUEUE!;
        const { messageCount } = await channel.checkQueue(queue);
        backlog = messageCount;
      }
    } catch {}

    const response: StatusResponse = {
      status: pgStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'degraded',
      uptime: Math.floor(start),
      consumer: {
        active: statusState.consumerActive,
        last_processed: statusState.lastProcessedId || undefined,
        last_processed_at: statusState.lastProcessedAt || undefined,
        backlog,
      },
      circuit_breaker: {
        state: statusState.circuitState,
        failures: statusState.circuitFailures,
        last_failure: statusState.circuitFailures > 0 ? new Date().toISOString() : undefined,
      },
      database: {
        postgres: pgStatus,
        redis: redisStatus,
      },
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };

    return response;
  });
}

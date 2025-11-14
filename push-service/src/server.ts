// src/server.ts
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

import health from './routes/health';
import metrics from './routes/metrics';
import status from './routes/status';
import statusRoutes from './routes/status/id';
import metricsIdRoutes from './routes/metrics/id';
import { publish } from './queue/rabbit';
import { runConsumer } from './consumer-run';

async function start() {
  const fastify = Fastify({ logger: true });

  // === Register all routes as plugins ===
  // === Swagger setup ===
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Push Service API',
        version: '1.0.0',
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  await fastify.register(fp(health));
  await fastify.register(metrics);
  await fastify.register(metricsIdRoutes, { prefix: '/metrics' });


  // === Push endpoint with schema ===
  fastify.post('/api/push', {
    schema: {
      tags: ['Push'],
      summary: 'Queue a new push notification',
      body: {
        type: 'object',
        required: ['request_id', 'recipient_id', 'device_token', 'payload'],
        properties: {
          request_id: { type: 'string' },
          recipient_id: { type: 'string' },
          device_token: { type: 'string' },
          payload: {
            type: 'object',
            required: ['title', 'body'],
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            request_id: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const body = req.body as any;
    await publish(fastify.rabbitChannel, process.env.PUSH_QUEUE!, body);
    return { status: 'queued', request_id: body.request_id };
  });

  await fastify.register(status);
  await fastify.register(statusRoutes, { prefix: '/status' });

  // === Start consumer and attach RabbitMQ channel ===
  const channel = await runConsumer();
  fastify.decorate('rabbitChannel', channel);

  await fastify.listen({ port: 4001, host: '0.0.0.0' });
}

// Extend Fastify instance for rabbitChannel
declare module 'fastify' {
  interface FastifyInstance {
    rabbitChannel: any;
  }
}

start();

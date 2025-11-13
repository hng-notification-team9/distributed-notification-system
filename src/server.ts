import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import health from './routes/health';
import metrics from './routes/metrics';
import statusRoutes from './routes/status/id';
import metricsIdRoutes from './routes/metrics/id';
import { publish } from './queue/rabbit';
import { runConsumer } from './consumer-run';

async function start() {
  const fastify = Fastify({ logger: true });

  // Register routes first
  await fastify.register(health);
  await fastify.register(metrics);
  await fastify.register(statusRoutes);
  await fastify.register(metricsIdRoutes, { prefix: '/metrics' });

  // Then register Swagger
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

  // Register push endpoint with schema
  fastify.post('/api/push', {
    schema: {
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

  const channel = await runConsumer();
  fastify.decorate('rabbitChannel', channel);

  await fastify.listen({ port: 4001, host: '0.0.0.0' });
}

declare module 'fastify' {
  interface FastifyInstance {
    rabbitChannel: any;
  }
}

start();

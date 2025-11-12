// src/server.ts
import Fastify from 'fastify';
import { publish } from './queue/rabbit';
import { runConsumer } from './consumer-run';
import health from './routes/health';
import metrics from './routes/metrics';
import statusRoutes from './routes/status/id';
import metricsIdRoutes from './routes/metrics/id';

async function start() {
  const fastify = Fastify({ logger: true });

  // === REGISTER ROUTES (BEFORE SERVER START) ===
  fastify.register(health);
  fastify.register(metrics);
  fastify.register(statusRoutes);
  fastify.register(metricsIdRoutes, { prefix: '/metrics' });

  // === /api/push ENDPOINT ===
  fastify.post('/api/push', async (request, reply) => {
    const body = request.body as any;

    const { request_id, recipient_id, device_token, payload } = body;

    if (!request_id || !recipient_id || !device_token || !payload?.title || !payload?.body) {
      return reply.status(400).send({
        error: 'Missing required fields',
        required: ['request_id', 'recipient_id', 'device_token', 'payload.title', 'payload.body'],
      });
    }

    try {
      const channel = await fastify.rabbitChannel; // We'll set this below
      await publish(channel, process.env.PUSH_QUEUE!, body);
      return reply.send({ status: 'queued', request_id });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to publish to queue');
      return reply.status(500).send({ error: 'Failed to queue push' });
    }
  });

  // === START SERVER ===
  const PORT = parseInt(process.env.PORT || '4001', 10);
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  fastify.log.info(`API running at http://0.0.0.0:${PORT}/api/push`);

  // === START RABBITMQ CONSUMER ===
  try {
    const channel = await runConsumer(); // Returns channel
    fastify.decorate('rabbitChannel', channel); // Save for /api/push
    fastify.log.info('Consumer started');
  } catch (err: any) {
    fastify.log.error({ err }, 'Consumer failed to start');
  }
}

// === DECORATE HELPER ===
declare module 'fastify' {
  interface FastifyInstance {
    rabbitChannel: any;
  }
}

start().catch(err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
import Fastify from 'fastify';
import health from './routes/health';
import metrics from './routes/metrics';
import { runConsumer } from './consumer-run';

async function start() {
  const fastify = Fastify({ logger: true });

  await fastify.register(health);
  await fastify.register(metrics);

  await fastify.listen({ port: 3000 });

  // start RabbitMQ consumer in the background
  runConsumer().catch(err => {
    fastify.log.error({ err }, 'Consumer crashed');
  });
}

start();

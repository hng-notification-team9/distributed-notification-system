import Fastify from 'fastify';
import health from './routes/health';
import metrics from './routes/metrics';
import statusRoutes from './routes/status/id';
import metricsIdRoutes from './routes/metrics/id';
import { runConsumer } from './consumer-run';

async function start() {
  const fastify = Fastify({ logger: true });

  await fastify.register(health);
  await fastify.register(metrics);
  await fastify.register(statusRoutes);
  await fastify.register(metricsIdRoutes);


  const PORT = parseInt(process.env.PORT || '3000');

  await fastify.listen({ port: PORT, host: '0.0.0.0' }); // <-- bind to 0.0.0.0

  // start RabbitMQ consumer in the background
  runConsumer().catch(err => {
    fastify.log.error({ err }, 'Consumer crashed');
  });
}

start();

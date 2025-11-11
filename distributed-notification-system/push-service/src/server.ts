import fastify from "fastify";
import dotenv from "dotenv";
import { consumeQueue } from "./queue/consumer";
import amqplib from "amqplib";
import { sentCount, failedCount, retryCount } from "./queue/consumer";
import { reprocessCached } from "./queue/reprocessor";
import { logger } from "./utils/logger";
import { getDeliveryStatus } from "./services/status";
import { circuitBreaker } from "./utils/circuitBreaker";
import { redis } from "./utils/cache";
import { initDB } from './db/postgres';
import pool from './db/postgres';
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";


dotenv.config();

const app = fastify({ logger: true });
const queue = process.env.QUEUE_NAME!;
const rabbitUrl = process.env.RABBITMQ_URL!;

app.register(swagger, {
  openapi: {
    info: {
      title: "Push Service API",
      version: "1.0.0",
      description: "API for sending push notifications",
    },
    servers: [
      { url: "http://localhost:4001" }
    ],
  },
});

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
  staticCSP: true,
  transformSpecification: (swaggerObject, request, reply) => {
    return swaggerObject;
  }
});


// In server init
initDB().catch(err => logger.error('DB init failed', err));
// Start queue consumer
consumeQueue().catch(err => {
  logger.error("Queue consumer failed:", err);
});

// Add to /health
app.get("/health",{
  schema: {
    summary: 'Check service health',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          service: { type: 'string' },
          queue: { type: 'string' },
          queue_length: { type: 'integer' },
          circuit_breaker: { type: 'string' }
        }
      }
    }
  }
 }, async () => {
  let queueStatus = "unknown";
  let queueLength = 0;
  try {
    const conn = await amqplib.connect(rabbitUrl);
    const channel = await conn.createChannel();
    const q = await channel.checkQueue(queue);
    queueStatus = "healthy";
    queueLength = q.messageCount;
    await channel.close();
    await conn.close();
  } catch (err) {
    queueStatus = "disconnected";
  }

  return {
    status: "ok",
    service: "push-service",
    queue: queueStatus,
    queue_length: queueLength,
    circuit_breaker: circuitBreaker["state"], // expose state
  };
});


app.get("/metrics", {
  schema: {
    summary: 'Get push service metrics',
    response: {
      200: {
        type: 'object',
        properties: {
          sent: { type: 'integer' },
          failed: { type: 'integer' },
          retried: { type: 'integer' },
          cached_unsent: { type: 'integer' }
        }
      }
    }
  }
},  async () => {
  const cached = await redis.keys("unsent:*");
  return {
    sent: sentCount,
    failed: failedCount,
    retried: retryCount,
    cached_unsent: cached.length,
  };
});
reprocessCached(); // runs every 60s by default

app.get("/metrics/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const cached = await redis.keys(`unsent:${id}:*`);
  return {
    id,
    sent: sentCount,
    failed: failedCount,
    retried: retryCount,
    cached_unsent: cached.length,
  };
});

// Update /status/:id
app.get('/status/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  try {
    const res = await pool.query('SELECT * FROM notifications WHERE request_id = $1', [id]);
    const status = res.rows[0];
    return { success: true, data: status || { status: 'not_found' } };
  } catch (err) {
    return { success: false, error: 'DB query failed' };
  }
});



const PORT = parseInt(process.env.PORT || "4000");
app.listen({ port: PORT }, (err, address) => {
  if (err) {
    logger.error(err);
    process.exit(1);
  }
  logger.info(`Server listening at ${address}`);
});

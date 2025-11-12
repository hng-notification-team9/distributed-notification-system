import amqp from 'amqplib';

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

let connection;
let channel;
let interval;

async function connect() {
  try {
    console.log('🔌 Connecting to RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    const exchange = 'notifications.direct';
    const queue = 'email.queue';
    const routingKey = 'email.queue';

    await channel.assertExchange(exchange, 'direct', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);

    console.log(
      '✅ Connected to RabbitMQ. Publishing messages every 5 seconds...',
    );

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed. Reconnecting...');
      reconnect();
    });

    connection.on('error', (err) => {
      console.error('❌ Connection error:', err.message);
    });

    startPublishing(exchange, routingKey);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    await new Promise((res) => setTimeout(res, 5000));
    reconnect();
  }
}

function startPublishing(exchange, routingKey) {
  if (interval) clearInterval(interval);

  interval = setInterval(async () => {
    try {
      const timestamp = Date.now();
      const message = {
        notification_id: `test-${timestamp}`,
        user_id: '42',
        template_code: 'WELCOME_EMAIL',
        variables: { name: 'John Doe' },
        request_id: `req-${timestamp}`,
        priority: 1,
      };

      channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify({
          pattern: 'email.queue',
          data: message
        })),
        {
          persistent: true,
        },
      );

      console.log(`📤 Published message ${message.request_id}`);
    } catch (err) {
      console.error('⚠️  Failed to publish message:', err.message);
    }
  }, 5000);
}

async function reconnect() {
  try {
    if (connection) await connection.close().catch(() => {});
  } catch {}
  setTimeout(connect, 5000);
}

function gracefulShutdown() {
  console.log('\n🛑 Shutting down publisher...');
  clearInterval(interval);
  if (connection) connection.close().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

connect();

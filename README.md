Here’s a concise `README.md` tailored for your **Push Service** microservice:

````markdown
# Push Service

## Overview
The Push Service is a microservice responsible for delivering push notifications to user devices. It consumes messages from the `push.queue` in RabbitMQ and sends them via Firebase Cloud Messaging (FCM). It includes retry logic and failure handling to ensure reliable delivery.

---

## Features
- Consumes messages from `push.queue` asynchronously.
- Sends notifications to FCM (Android, iOS, Web).
- Retries failed messages up to 5 times with exponential backoff.
- Moves permanently failed messages to `failed.queue`.
- Tracks notification status in Redis/PostgreSQL.
- Provides monitoring endpoints: `/health`, `/metrics`, `/status`.

---

## Endpoints

### `/health`
- **Method:** GET
- **Description:** Checks the health of Redis, PostgreSQL, and RabbitMQ connections.
- **Response Example:**
```json
{
  "success": true,
  "message": "All systems operational",
  "data": {
    "redis": "connected",
    "postgres": "connected",
    "rabbitmq": "connected"
  }
}
````

### `/metrics`

* **Method:** GET
* **Description:** Returns counters of push notifications.
* **Response Example:**

```json
{
  "total_success": 950,
  "total_failed": 45,
  "total_retries": 50
}
```

### `/status`

* **Method:** GET
* **Description:** Returns real-time service state.
* **Response Example:**

```json
{
  "consumer_state": "active",
  "last_processed_message_id": "abc123",
  "last_processed_time": "2025-11-14T14:05:00Z",
  "circuit_breaker": "closed",
  "retry_backlog": 3,
  "uptime": "5h12m"
}
```

---

## Message Payload Example

```json
{
  "request_id": "1234abcd",
  "user_id": "5678efgh",
  "device_token": "<FCM_DEVICE_TOKEN>",
  "title": "Hello",
  "body": "You have a new notification",
  }

```

---

## Dependencies

* Node.js 20+
* RabbitMQ
* Redis
* PostgreSQL
* Firebase Cloud Messaging (FCM)

---

## Running Locally

1. Clone the repository.
2. Set environment variables:

```
RABBITMQ_URL=amqp://localhost
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://user:password@localhost:5432/db
FCM_SERVER_KEY=<YOUR_FCM_SERVER_KEY>
```

3. Install dependencies:

```bash
npm install
```

4. Start service:

```bash
npm start
```

---

## Docker

```bash
docker build -t push-service .
docker run -d -p 3000:3000 --env-file .env push-service
```

---

## CI/CD

* Build, test, and deploy automatically via GitHub Actions.
* Health checks and metrics are verified post-deployment.

---

# Distributed Notification System - API Gateway

**Live API**: https://distributed-notification-system-production.up.railway.app/  
**API Documentation**: https://distributed-notification-system-production.up.railway.app/api/docs/  
**Health Check**: https://distributed-notification-system-production.up.railway.app/health/

## Project Overview

This is the API Gateway service for a distributed notification system built as part of Stage 4 Backend Task. The system handles email and push notifications using microservices architecture with asynchronous message processing through RabbitMQ.

### Goal
Build a scalable, fault-tolerant notification system that processes 1,000+ notifications per minute with 99.5% delivery success rate.

### Team Structure
- API Gateway Service (This repository) - Entry point, request validation, routing
- User Service - User management and preferences (handled by teammates)
- Email Service - Email notification processing (handled by teammates)
- Push Service - Push notification delivery (handled by teammates)
- Template Service - Template management (handled by teammates)

## System Architecture

```
API Gateway (Django)
       |
RabbitMQ (notifications.direct exchange)
       |-- email.queue -> Email Service
       |-- push.queue -> Push Service
       |-- failed.queue -> Dead Letter Queue
```

## API Endpoints Testing

### 1. Health Check - Verify System Status

```bash
curl https://distributed-notification-system-production.up.railway.app/health/
```

Expected Response:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "cache": true,
    "message_queue": true
  },
  "timestamp": 1705311000.123456
}
```

### 2. Create Email Notification

```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "welcome_email",
    "variables": {
      "name": "John Doe",
      "link": "https://example.com/verify",
      "meta": {"source": "web"}
    },
    "request_id": "req_123456789",
    "priority": 1,
    "metadata": {"campaign": "welcome"}
  }'
```

Success Response (202):
```json
{
  "success": true,
  "data": {
    "notification_id": "req_123456789",
    "status": "queued"
  },
  "message": "Notification queued successfully"
}
```

### 3. Create Push Notification

```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "push",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "welcome_push",
    "variables": {
      "name": "Jane Smith",
      "link": "https://example.com/app",
      "meta": {"device": "mobile"}
    },
    "request_id": "req_987654321",
    "priority": 2,
    "metadata": {"platform": "ios"}
  }'
```

### 4. List All Notifications

```bash
curl https://distributed-notification-system-production.up.railway.app/api/v1/notifications/
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "notification_type": "email",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "template_code": "welcome_email",
      "request_id": "req_123456789",
      "priority": 1,
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Notifications retrieved successfully",
  "meta": {
    "total": 150,
    "limit": 20,
    "page": 1,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

### 5. Update Notification Status

```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/email/status/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_id": "req_123456789",
    "status": "delivered",
    "timestamp": "2024-01-15T10:35:00Z",
    "error": null
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

### 6. Check Circuit Breaker Status

```bash
curl https://distributed-notification-system-production.up.railway.app/api/v1/circuit-breakers/
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "rabbitmq": {
      "name": "rabbitmq",
      "state": "CLOSED",
      "failures": 0,
      "last_failure_time": null,
      "last_state_change": 1705311000.123456
    },
    "database": {
      "name": "database",
      "state": "CLOSED",
      "failures": 0,
      "last_failure_time": null,
      "last_state_change": 1705311000.123456
    }
  },
  "message": "Circuit breaker status retrieved successfully"
}
```

### 7. Reset Circuit Breaker

```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/circuit-breakers/rabbitmq/reset/
```

Expected Response:
```json
{
  "success": true,
  "message": "Circuit breaker rabbitmq reset successfully"
}
```

### 8. Test Duplicate Request Protection

First request:
```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "test_duplicate",
    "variables": {
      "name": "Test User",
      "link": "https://example.com"
    },
    "request_id": "duplicate_test_123",
    "priority": 1
  }'
```

Second request (same request_id):
```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "test_duplicate",
    "variables": {
      "name": "Test User",
      "link": "https://example.com"
    },
    "request_id": "duplicate_test_123",
    "priority": 1
  }'
```

Both requests return the same response, preventing duplicate processing.

### 9. Test Validation Errors

Missing required field:
```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "test_template",
    "variables": {
      "name": "Test User",
      "link": "https://example.com"
    },
    "request_id": "test_123"
  }'
```

Expected Error Response (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid request data",
  "data": {
    "notification_type": ["This field is required."]
  }
}
```

### 10. Test with Invalid Data

Invalid notification type:
```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "sms",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "test_template",
    "variables": {
      "name": "Test User",
      "link": "https://example.com"
    },
    "request_id": "test_456",
    "priority": 1
  }'
```

Expected Error Response (400):
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid request data",
  "data": {
    "notification_type": ["\"sms\" is not a valid choice."]
  }
}
```

## Complete Test Sequence

Run these commands in order to test the full functionality:

1. Check system health:
```bash
curl https://distributed-notification-system-production.up.railway.app/health/
```

2. Send a test email notification:
```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "test_template",
    "variables": {
      "name": "Test User",
      "link": "https://example.com"
    },
    "request_id": "test_$(date +%s)",
    "priority": 1
  }'
```

3. View all notifications:
```bash
curl https://distributed-notification-system-production.up.railway.app/api/v1/notifications/
```

4. Check circuit breaker status:
```bash
curl https://distributed-notification-system-production.up.railway.app/api/v1/circuit-breakers/
```

5. Test duplicate protection (run twice with same request_id):
```bash
curl -X POST https://distributed-notification-system-production.up.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "duplicate_test",
    "variables": {
      "name": "Duplicate Test",
      "link": "https://example.com"
    },
    "request_id": "duplicate_123",
    "priority": 1
  }'
```

## Technology Stack

- Framework: Django 4.x + Django REST Framework
- Database: PostgreSQL (Railway)
- Message Queue: RabbitMQ
- Cache: Redis
- Containerization: Docker
- Deployment: Railway
- API Documentation: DRF Spectacular (OpenAPI 3.0)

## Key Features

- Request Validation - Comprehensive input validation
- Message Routing - Routes to appropriate queues (email/push)
- Status Tracking - Tracks notification lifecycle
- Idempotency - Prevents duplicate processing
- Circuit Breaker Pattern - Prevents cascading failures
- Exponential Backoff Retry - Automatic retry with backoff
- Request Throttling - Rate limiting (1000 requests/hour)
- Health Monitoring - Comprehensive health checks
- Correlation IDs - End-to-end request tracking

## Performance Metrics

- API Response Time: < 100ms
- Throughput: 1,000+ notifications/minute
- Success Rate: 99.5%+
- Availability: 99.9%+

For full API documentation, visit: https://distributed-notification-system-production.up.railway.app/api/docs/

Built for Stage 4 Backend Task - Distributed Notification System
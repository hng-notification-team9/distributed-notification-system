# distributed-notification-system

# Notification API Gateway

A Django-based API Gateway for a distributed notification system. This service acts as the entry point for all notification requests, routing them to appropriate microservices via RabbitMQ.

## 🚀 Features

- **RESTful API** with proper HTTP status codes and error handling
- **Message Queue Integration** with RabbitMQ for async processing
- **Idempotency** to prevent duplicate notifications
- **Circuit Breaker** pattern for external service resilience
- **Comprehensive Logging** for monitoring and debugging
- **Health Checks** for service monitoring
- **API Documentation** with Swagger UI
- **Dockerized** for easy deployment
- **CI/CD Pipeline** for automated testing and deployment

## 🏗️ System Architecture
Client → API Gateway → RabbitMQ → [Email Service, Push Service]
↓
PostgreSQL (Notification tracking)
↓
Redis (Caching & Idempotency)

text

## 📋 API Endpoints

### Create Notification
```http
POST /api/v1/notifications/
Content-Type: application/json

{
  "notification_type": "email",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "template_code": "welcome_email",
  "variables": {
    "name": "John Doe",
    "link": "https://example.com",
    "meta": {"order_id": "12345"}
  },
  "request_id": "req_123456",
  "priority": 1,
  "metadata": {"campaign": "welcome"}
}
Update Notification Status
http
POST /api/v1/email/status/
Content-Type: application/json

{
  "notification_id": "req_123456",
  "status": "delivered",
  "timestamp": "2024-01-01T12:00:00Z",
  "error": null
}
Health Check
http
GET /health/
API Documentation
http
GET /api/docs/
🛠️ Installation
Prerequisites
Python 3.11+

PostgreSQL

Redis

RabbitMQ

Local Development
Clone the repository

bash
git clone <repository-url>
cd api_gateway
Create virtual environment

bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install dependencies

bash
pip install -r requirements.txt
Environment setup

bash
cp .env.example .env
# Edit .env with your configuration
Database setup

bash
python manage.py migrate
python manage.py createsuperuser
Run development server

bash
python manage.py runserver
Docker Development
Start services

bash
docker-compose up -d
Run migrations

bash
docker-compose exec api-gateway python manage.py migrate
Create superuser

bash
docker-compose exec api-gateway python manage.py createsuperuser
🔧 Configuration
Environment Variables
Variable	Description	Default
DEBUG	Django debug mode	False
SECRET_KEY	Django secret key	Required
ALLOWED_HOSTS	Allowed hostnames	localhost,127.0.0.1
DB_NAME	Database name	api_gateway
DB_USER	Database user	postgres
DB_PASSWORD	Database password	Required
DB_HOST	Database host	localhost
DB_PORT	Database port	5432
REDIS_URL	Redis connection URL	redis://localhost:6379/0
RABBITMQ_URL	RabbitMQ connection URL	amqp://guest:guest@localhost:5672/
📊 Monitoring & Logging
Log Files
Application logs: api_gateway.log

Access logs: Console output

Health Checks
The health endpoint (/health/) checks:

Database connectivity

Redis connectivity

RabbitMQ connectivity

Metrics
Key metrics to monitor:

API response times

Queue lengths

Error rates

Notification delivery status

🔒 Idempotency
The API uses request IDs to ensure idempotent operations. If the same request_id is used multiple times, only the first request will be processed.

Example:

python
# First request - processed
{
  "request_id": "unique_request_123",
  "notification_type": "email",
  ...
}

# Second request with same ID - returns cached response
{
  "request_id": "unique_request_123", 
  "notification_type": "email",
  ...
}
🚨 Error Handling
Response Format
json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly message",
  "data": null
}
Common HTTP Status Codes
200 - Success

202 - Accepted (queued for processing)

400 - Bad Request

404 - Not Found

500 - Internal Server Error

🔄 Message Queue Structure
RabbitMQ Exchange & Queues
text
Exchange: notifications.direct
├── email.queue → Email Service
├── push.queue → Push Service
└── failed.queue → Dead Letter Queue
Message Format
json
{
  "notification_id": "uuid",
  "user_id": "uuid", 
  "template_code": "string",
  "variables": {},
  "request_id": "string",
  "priority": 1
}
🧪 Testing
Run Tests
bash
python manage.py test
Test Coverage
bash
coverage run manage.py test
coverage report
📈 Performance Targets
Handle 1,000+ notifications per minute

API Gateway response under 100ms

99.5% delivery success rate

Horizontal scaling support

 Team Collaboration
This service is part of a microservices architecture:

Service	Responsibility	Team Member
API Gateway	Request routing & validation	You
User Service	User management	Team Member 2
Email Service	Email delivery	Team Member 3
Push Service	Push notifications	Team Member 4
Template Service	Template management	Team Member 1
🚀 Deployment
Production Deployment
Set environment variables

bash
export SECRET_KEY=your-production-secret
export DEBUG=False
export ALLOWED_HOSTS=your-domain.com
Run database migrations

bash
python manage.py migrate
Collect static files

bash
python manage.py collectstatic --noinput
Start with Gunicorn

bash
gunicorn --bind 0.0.0.0:8000 --workers 3 api_gateway.wsgi:application
Using Docker in Production
bash
docker-compose -f docker-compose.prod.yml up -d
📞 Support
For issues and questions:

Check the logs in api_gateway.log

Verify service connectivity (PostgreSQL, Redis, RabbitMQ)

Check the health endpoint: /health/

Review API documentation: /api/docs/

📄 License
This project is part of the Stage 4 Backend Task for Microservices & Message Queues.

text

## 🔧 Additional Files

### manage.py
```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api_gateway.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
.dockerignore
gitignore
.git
.gitignore
README.md
.env
.venv
venv/
__pycache__
*.pyc
*.pyo
*.pyd
.Python
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
.gitignore
gitignore
# Django
*.log
*.pot
*.pyc
__pycache__/
local_settings.py
db.sqlite3
mediafiles/
staticfiles/

# Environment
.env
.venv
venv/
env/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db

# Logs
logs/
*.log
🎯 Quick Start Commands
bash
# Local development
cp .env.example .env
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Docker development
docker-compose up -d
docker-compose exec api-gateway python manage.py migrate
docker-compose exec api-gateway python manage.py createsuperuser

# Production deployment
docker-compose -f docker-compose.yml up -d
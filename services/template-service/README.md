# Template Service

**Distributed Notification System - Template Management Microservice**

## Ì≥ã Overview

The Template Service handles:
- Template storage and management (email & push notifications)
- Variable substitution in templates
- Multi-language template support
- Template versioning and history
- Template rendering with dynamic data

## Ìª†Ô∏è Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Documentation**: Swagger/OpenAPI
- **Container**: Docker

## Ì∫Ä Quick Start

### Prerequisites

- Node.js 20.x
- PostgreSQL 15
- Docker & Docker Compose (optional)

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start database
docker-compose up -d

# Run migrations
npx prisma migrate dev
npx prisma generate

# Start service
npm run start:dev
```

The service will be available at:
- **API**: http://localhost:3004/api/v1
- **Swagger**: http://localhost:3004/api/docs
- **Health**: http://localhost:3004/api/v1/health

## Ì≥ö API Endpoints

### Templates
```
POST   /api/v1/templates              - Create template
GET    /api/v1/templates              - List templates (with filters)
GET    /api/v1/templates/:id          - Get template by ID
GET    /api/v1/templates/name/:name   - Get template by name
POST   /api/v1/templates/:id/render   - Render template with variables
PUT    /api/v1/templates/:id          - Update template
DELETE /api/v1/templates/:id          - Delete template
```

### Template Variables
```
POST   /api/v1/templates/:id/variables              - Add variable
GET    /api/v1/templates/:id/variables              - List variables
GET    /api/v1/templates/:id/variables/:variableId  - Get variable
PUT    /api/v1/templates/:id/variables/:variableId  - Update variable
DELETE /api/v1/templates/:id/variables/:variableId  - Delete variable
```

### Template Versions
```
GET    /api/v1/templates/:id/versions                 - List versions
GET    /api/v1/templates/:id/versions/latest          - Get latest version
GET    /api/v1/templates/:id/versions/:versionNumber  - Get specific version
GET    /api/v1/templates/:id/versions/compare/:v1/:v2 - Compare versions
```

### Health Check
```
GET    /api/v1/health                 - Health check
```

## Ì≥ä Response Format

All responses follow this format:
```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "message": string,
  "meta": {
    "total": number,
    "limit": number,
    "page": number,
    "total_pages": number,
    "has_next": boolean,
    "has_previous": boolean
  }
}
```

## Ì≥ù Template Format

Templates use `{{variable}}` syntax for variable substitution:

### Example Email Template:
```json
{
  "name": "welcome-email",
  "type": "email",
  "subject": "Welcome to {{app_name}}!",
  "body": "Hello {{user_name}}, welcome to {{app_name}}! Your account has been created.",
  "language": "en"
}
```

### Rendering:
```json
POST /api/v1/templates/{id}/render
{
  "variables": {
    "user_name": "John Doe",
    "app_name": "MyApp"
  }
}
```

### Result:
```json
{
  "subject": "Welcome to MyApp!",
  "body": "Hello John Doe, welcome to MyApp! Your account has been created."
}
```

## Ìºç Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)

## Ì∑™ Testing
```bash
npm test
npm run test:cov
```

## Ì∞≥ Docker
```bash
# Build image
docker build -t template-service:latest .

# Run with docker-compose
docker-compose up
```

## Ì¥ê Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| PORT | Server port | No (default: 3004) |
| NODE_ENV | Environment | No (default: development) |
| MAX_TEMPLATE_SIZE | Max template body size | No (default: 10000) |
| SUPPORTED_LANGUAGES | Comma-separated language codes | No |
| DEFAULT_LANGUAGE | Default language | No (default: en) |

## Ì≥ê Database Schema

### Tables:
- **templates** - Template definitions
- **template_versions** - Version history
- **template_variables** - Variable definitions

### Relationships:
- Template ‚Üí has many ‚Üí TemplateVersions
- Template ‚Üí has many ‚Üí TemplateVariables

## Ì¥Ñ Version Control

When a template body is updated:
1. New version is automatically created
2. Old versions are preserved
3. Version number increments
4. Change notes can be added

## ÌæØ Use Cases

### Email Service Integration:
```javascript
// 1. Get template
GET /api/v1/templates/name/welcome-email

// 2. Render with user data
POST /api/v1/templates/{id}/render
{
  "variables": {
    "user_name": "John",
    "verification_link": "https://..."
  }
}

// 3. Send rendered content via Email Service
```

### Push Notification Integration:
```javascript
// 1. Get push template
GET /api/v1/templates/name/order-update-push

// 2. Render with order data
POST /api/v1/templates/{id}/render
{
  "variables": {
    "order_id": "12345",
    "status": "shipped"
  }
}

// 3. Send via Push Service
```

## Ì¥ó Service Integration

This service integrates with:
- **Email Service** - Provides email templates
- **Push Service** - Provides push notification templates
- **API Gateway** - Routes requests to this service
- **User Service** - May use user data for personalization

## Ì≥Ñ License

This project is part of HNG Internship Stage 8.

## Ì±• Team

Team 9 - Distributed Notification System

## Ì≥û Support

For issues or questions:
- Check API documentation: http://localhost:3004/api/docs
- Review database schema: `npx prisma studio`
- Check health endpoint: http://localhost:3004/api/v1/health

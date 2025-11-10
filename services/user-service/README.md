# User Service

**Distributed Notification System - User Management Microservice**

## Ì≥ã Overview

The User Service handles:
- User authentication (registration, login)
- User profile management
- Notification preferences
- Push notification tokens
- Authorization and access control

## Ìª†Ô∏è Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: JWT
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
- **API**: http://localhost:3001/api/v1
- **Swagger**: http://localhost:3001/api/docs
- **Health**: http://localhost:3001/api/v1/health

## Ì≥ö API Endpoints

### Public Endpoints

### Protected Endpoints (Requires JWT)

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

## Ì∑™ Testing
```bash
npm test
npm run test:cov
```

## Ì∞≥ Docker
```bash
# Build image
docker build -t user-service:latest .

# Run with docker-compose
docker-compose up
```

## Ì¥ê Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_EXPIRATION | JWT token expiration | No (default: 24h) |
| JWT_REFRESH_SECRET | Refresh token secret | Yes |
| PORT | Server port | No (default: 3001) |
| NODE_ENV | Environment | No (default: development) |

## Ì≥Ñ License

This project is part of HNG Internship Stage 8.

## Ì±• Team

Team 9 - Distributed Notification System

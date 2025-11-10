  
**Stage 4 Backend Task: Microservices & Message Queues**

**Task Title:** Distributed Notification System  

**Goal/Objective:**  
Build a notification system that sends emails and push notifications using separate microservices. Each service should communicate asynchronously through a message queue (e.g., RabbitMQ or Kafka).

**Task Execution:**  
- You will be working as a group in teams of 4.  
- Airtable link: [Provided separately]  
- You're required to write the CI/CD workflow for deployment.  
- Request/Response/Model naming convention should be snake_case.  
- To request for a server for deployment, use the command `/request-server`.  

**Explainer Video:** TikTok Video  

**Services to Build:**

**API Gateway Service:**  
- Entry point for all notification requests  
- Validates and authenticates requests  
- Routes messages to the correct queue (email or push)  
- Tracks notification status  

**User Service:**  
- Manages user contact info (email, push tokens)  
- Stores notification preferences  
- Handles login and permissions  
- Exposes REST APIs for user data  

**Email Service:**  
- Reads messages from the email queue  
- Fills templates with variables (e.g., `{{name}}`)  
- Sends emails using SMTP or APIs (SendGrid, Mailgun, Gmail)  
- Handles delivery confirmations and bounces  

**Push Service:**  
- Reads messages from the push queue  
- Sends mobile or web push notifications  
- Validates device tokens  
- Supports rich notifications (title, text, image, link)  
- **Free Push Options:** Firebase Cloud Messaging (FCM), OneSignal (Free Plan), Web Push with VAPID (Self-Hosted)  

**Template Service:**  
- Stores and manages notification templates  
- Handles variable substitution  
- Supports multiple languages  
- Keeps version history for templates  

**Message Queue Setup**  
Example (RabbitMQ):  
```
Exchange: notifications.direct  
├── email.queue → Email Service  
├── push.queue → Push Service  
└── failed.queue → Dead Letter Queue  
```

**Response Format:**
```typescript
{
  success: boolean,
  data?: T,
  error?: string,
  message: string,
  meta: PaginationMeta
}

interface PaginationMeta {
  total: number,
  limit: number,
  page: number,
  total_pages: number,
  has_next: boolean,
  has_previous: boolean
}
```

**Key Technical Concepts:**  
1. **Circuit Breaker:** Prevents total system failure when a service (like SMTP or FCM) goes down.  
2. **Retry System:** Retry failed messages with exponential backoff and move permanently failed messages to the dead-letter queue.  
3. **Service Discovery:** Allows services to find each other dynamically.  
4. **Health Checks:** Each service should have a `/health` endpoint for status monitoring.  
5. **Idempotency:** Prevent duplicate notifications by using unique request IDs.  
6. **Service Communication:**  
   - **Synchronous (REST):** User preference lookups, Template retrieval, Status queries  
   - **Asynchronous (Message Queue):** Notification processing, Retry handling, Status updates  

**Data Storage Strategy:**  
- Each service uses its own database:  
  - User Service: PostgreSQL (user data, preferences)  
  - Template Service: PostgreSQL (templates, versions)  
  - Notification Services: Local cache + shared status store  
- **Shared Tools:** Redis for caching user preferences, managing rate limits, etc., and RabbitMQ/Kafka for async message queuing  

**Failure Handling:**  
- **Service Failures:** Circuit breaker prevents cascading issues and other services continue running.  
- **Message Processing Failures:** Automatic retries with exponential backoff; permanent failures go to the dead-letter queue.  
- **Network Issues:** Use local cache and continue essential operations gracefully.  

**Monitoring & Logs:**  
- **Track Metrics:** Message rate per queue, Service response times, Error rates, Queue length and lag.  
- **Logging:** Use correlation IDs and log every notification's lifecycle.  

**System Design Diagram:**  
Each team must submit a simple diagram showing:  
- Service connections  
- Queue structure  
- Retry and failure flow  
- Database relationships  
- Scaling plan  

You can use Draw.io, Miro, or Lucidchart (free tools).  

**Performance Targets:**  
- Handle 1,000+ notifications per minute  
- API Gateway response under 100ms  
- 99.5% delivery success rate  
- All services support horizontal scaling  

**Recommended Tech Stack:**  
- **Languages:** PHP, Node.js (!express), Python, Go, or Java (Any language of your choice is welcomed)  
- **Queue:** RabbitMQ or Kafka  
- **Database:** PostgreSQL + Redis  
- **Containerization:** Docker  
- **API Docs:** OpenAPI or Swagger  

**Learning Outcomes:**  
This stage teaches:  
- Microservices decomposition  
- Asynchronous messaging patterns  
- Distributed system failure handling  
- Event-driven architecture design  
- Scalable and fault-tolerant notification systems  
- Team work and collaboration  

**Submission Format:**  
- Use the command `/submit` in the channel to make submission.  
- Prepare to present your work (anyone can be called to answer any question).  
- **Deadline for submission:** Wednesday 12th of November, 2025. 11:59pm GMT +1 (WAT)  

May the road rise up to meet you.  

---

**@channel**  
In lieu of that, here's the Request formats:  

**POST /api/v1/notifications/**  
```typescript
{
  notification_type: NotificationType,
  user_id: uuid,
  template_code: str | path,
  variables: UserData,
  request_id: str,
  priority: int,
  metadata: Optional[dict]
}

class NotificationType(str, Enum):
    email = "email"
    push = "push"

class UserData:
    name: str
    link: HttpUrl
    meta: Optional[dict]
```

**POST /api/v1/users/**  
```typescript
{
  name: str,
  email: Email,
  push_token: Optional[str],  // can be updated with an update endpoint
  preferences: UserPreference,
  password: str
}

class UserPreference:
    email: bool,
    push: bool
```

**POST /api/v1/{notification_preference}/status/**  
```typescript
{
  notification_id: str,
  status: NotificationStatus,
  timestamp: Optional[datetime],
  error: Optional[str]
}

class NotificationStatus(str, Enum):
    delivered = "delivered",
    pending = "pending", 
    failed = "failed"
```

📋 Test Commands for After Deployment
Once deployed, test your API with these curl commands:

1. Test Health Endpoint
bash
curl https://your-app-name.railway.app/health/
2. Test API Documentation
bash
curl https://your-app-name.railway.app/api/docs/
3. Test Notification Creation
bash
curl -X POST https://your-app-name.railway.app/api/v1/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "template_code": "welcome_email",
    "variables": {
      "name": "John Doe",
      "link": "https://example.com"
    },
    "request_id": "test_req_001",
    "priority": 1
  }'
4. Test List Notifications
bash
curl https://your-app-name.railway.app/api/v1/notifications/list/

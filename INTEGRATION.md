# User Service & Template Service - Integration Guide

**Last Updated:** November 12, 2025  
**Status:** ‚úÖ Production Ready

---

## Ìºê Service URLs

### Production (Azure)

**User Service:**
```
Base URL: https://user-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io
Swagger: https://user-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io/api/docs
Health: https://user-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io/api/v1/health
```

**Template Service:**
```
Base URL: https://template-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io
Swagger: https://template-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io/api/docs
Health: https://template-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io/api/v1/health
```

---

## Ì¥ê Authentication

### Get Access Token
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "status": "success",
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "user": {...}
  },
  "message": "Login successful"
}
```

### Use Token
```bash
Authorization: Bearer eyJhbGc...
```

---

## Ì≥ö User Service Endpoints

### 1. ‚≠ê Validate Token (NEW - For Service-to-Service Auth)

**Purpose:** Other services use this to validate JWT tokens
```bash
GET /api/v1/auth/validate
Authorization: Bearer {token}

Response:
{
  "status": "success",
  "data": {
    "valid": true,
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  },
  "message": "Token is valid"
}

Error (401):
{
  "status": "error",
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 2. Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

### 3. Get User by ID
```bash
GET /api/v1/users/{userId}
Authorization: Bearer {token}

Response:
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true
  }
}
```

### 4. Get User Preferences
```bash
GET /api/v1/users/{userId}/preferences
Authorization: Bearer {token}

Response:
{
  "status": "success",
  "data": {
    "email_enabled": true,
    "sms_enabled": false,
    "push_enabled": true,
    "timezone": "UTC",
    "language": "en"
  }
}
```

### 5. Get Push Tokens
```bash
GET /api/v1/users/{userId}/push-tokens
Authorization: Bearer {token}

Response:
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "token": "fcm-token-123",
      "device_type": "ios",
      "is_active": true
    }
  ]
}
```

---

## Ì≥ö Template Service Endpoints

### 1. Get Template by Name
```bash
GET /api/v1/templates/name/{templateName}

Response:
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "welcome-email",
    "type": "email",
    "subject": "Welcome {{user_name}}!",
    "body": "Hi {{user_name}}, welcome to {{app_name}}!"
  }
}
```

### 2. Get Template by ID
```bash
GET /api/v1/templates/{templateId}

Response: (same as above)
```

### 3. Render Template
```bash
POST /api/v1/templates/{templateId}/render
Content-Type: application/json

{
  "variables": {
    "user_name": "John Doe",
    "app_name": "NotificationApp",
    "verify_url": "https://example.com/verify"
  }
}

Response:
{
  "status": "success",
  "data": {
    "subject": "Welcome John Doe!",
    "body": "Hi John Doe, welcome to NotificationApp!",
    "template_id": "uuid",
    "template_name": "welcome-email"
  }
}
```

### 4. List All Templates
```bash
GET /api/v1/templates

Response:
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "welcome-email",
      "type": "email",
      "language": "en"
    }
  ]
}
```

---

## Ì¥Ñ Integration Examples

### Example 1: Email Service (Python)
```python
import requests

USER_SERVICE = "https://user-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io"
TEMPLATE_SERVICE = "https://template-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io"

def send_welcome_email(user_id: str, auth_token: str):
    # 1. Get user details
    user_response = requests.get(
        f"{USER_SERVICE}/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    user = user_response.json()['data']
    
    # 2. Check email preferences
    prefs_response = requests.get(
        f"{USER_SERVICE}/api/v1/users/{user_id}/preferences",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    preferences = prefs_response.json()['data']
    
    if not preferences['email_enabled']:
        return {"status": "skipped", "reason": "Email disabled"}
    
    # 3. Get template
    template_response = requests.get(
        f"{TEMPLATE_SERVICE}/api/v1/templates/name/welcome-email"
    )
    template = template_response.json()['data']
    
    # 4. Render template
    render_response = requests.post(
        f"{TEMPLATE_SERVICE}/api/v1/templates/{template['id']}/render",
        json={
            "variables": {
                "user_name": f"{user['first_name']} {user['last_name']}",
                "app_name": "NotificationApp"
            }
        }
    )
    rendered = render_response.json()['data']
    
    # 5. Send email
    send_smtp_email(user['email'], rendered['subject'], rendered['body'])
    
    return {"status": "sent", "to": user['email']}
```

### Example 2: Push Service (Node.js)
```javascript
const axios = require('axios');

const USER_SERVICE = 'https://user-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io';
const TEMPLATE_SERVICE = 'https://template-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io';

async function sendPushNotification(userId, templateName, variables, authToken) {
  // 1. Get user
  const userResponse = await axios.get(
    `${USER_SERVICE}/api/v1/users/${userId}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  const user = userResponse.data.data;

  // 2. Check push preferences
  const prefsResponse = await axios.get(
    `${USER_SERVICE}/api/v1/users/${userId}/preferences`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  const preferences = prefsResponse.data.data;

  if (!preferences.push_enabled) {
    return { status: 'skipped', reason: 'Push disabled' };
  }

  // 3. Get push tokens
  const tokensResponse = await axios.get(
    `${USER_SERVICE}/api/v1/users/${userId}/push-tokens`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  const tokens = tokensResponse.data.data;

  if (tokens.length === 0) {
    return { status: 'skipped', reason: 'No push tokens' };
  }

  // 4. Get and render template
  const templateResponse = await axios.get(
    `${TEMPLATE_SERVICE}/api/v1/templates/name/${templateName}`
  );
  const template = templateResponse.data.data;

  const renderResponse = await axios.post(
    `${TEMPLATE_SERVICE}/api/v1/templates/${template.id}/render`,
    { variables }
  );
  const rendered = renderResponse.data.data;

  // 5. Send push to all active tokens
  for (const token of tokens.filter(t => t.is_active)) {
    await sendPushToDevice(token.token, rendered.subject, rendered.body);
  }

  return { status: 'sent', count: tokens.length };
}
```

### Example 3: API Gateway Validation
```javascript
// Middleware to validate tokens from other services
async function validateUserToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const response = await axios.get(
      'https://user-service-app.blacksky-6bcbe9ee.uksouth.azurecontainerapps.io/api/v1/auth/validate',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.data.valid) {
      req.user = response.data.data.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token validation failed' });
  }
}
```

---

## Ì∑™ Test Data

**Test User:**
```
Email: test@example.com
Password: TestPass123!
```

**Available Templates:**
- `welcome-email` - Welcome message for new users
- `verify-email` - Email verification template
- `password-reset` - Password reset template

---

## ‚ö†Ô∏è Error Handling

All endpoints return errors in this format:
```json
{
  "status": "error",
  "error": "Error message",
  "statusCode": 400
}
```

**Common Status Codes:**
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate email, etc.)
- `500` - Internal Server Error

---

## Ì≥û Support

**For questions or issues:**
- **GitHub Issues:** [Create an issue](https://github.com/hng-notification-team9/distributed-notification-system/issues)
- **Team Chat:** #notification-system channel
- **Email:** Your team email

---

## ÌæØ Quick Start for Other Services

1. **Authenticate users:** Use `/api/v1/auth/login` to get tokens
2. **Validate tokens:** Use `/api/v1/auth/validate` to verify tokens
3. **Get user data:** Use `/api/v1/users/{id}` with Bearer token
4. **Check preferences:** Use `/api/v1/users/{id}/preferences`
5. **Get templates:** Use `/api/v1/templates/name/{name}`
6. **Render content:** Use `/api/v1/templates/{id}/render`

---

**Both services are production-ready and waiting for integration!** Ì∫Ä

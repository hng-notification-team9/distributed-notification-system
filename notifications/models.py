from django.db import models
import uuid

class NotificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    DELIVERED = 'delivered', 'Delivered'
    FAILED = 'failed', 'Failed'

class NotificationType(models.TextChoices):
    EMAIL = 'email', 'Email'
    PUSH = 'push', 'Push'

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(max_length=10, choices=NotificationType.choices)
    user_id = models.UUIDField()
    template_code = models.CharField(max_length=255)
    variables = models.JSONField(default=dict)
    request_id = models.CharField(max_length=255, unique=True)
    priority = models.IntegerField(default=1)
    metadata = models.JSONField(default=dict, null=True, blank=True)
    status = models.CharField(
        max_length=10, 
        choices=NotificationStatus.choices, 
        default=NotificationStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['request_id']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]

class IdempotencyKey(models.Model):
    key = models.CharField(max_length=255, primary_key=True)
    response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'idempotency_keys'
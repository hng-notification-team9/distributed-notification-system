from rest_framework import serializers
from .models import Notification, NotificationType, NotificationStatus

class UserDataSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    link = serializers.URLField()
    meta = serializers.DictField(required=False, allow_null=True)

class NotificationCreateSerializer(serializers.Serializer):
    notification_type = serializers.ChoiceField(choices=NotificationType.choices)
    user_id = serializers.UUIDField()
    template_code = serializers.CharField(max_length=255)
    variables = UserDataSerializer()
    request_id = serializers.CharField(max_length=255)
    priority = serializers.IntegerField(min_value=1, max_value=10, default=1)
    metadata = serializers.DictField(required=False, allow_null=True)

class NotificationStatusUpdateSerializer(serializers.Serializer):
    notification_id = serializers.CharField(max_length=255)
    status = serializers.ChoiceField(choices=NotificationStatus.choices)
    timestamp = serializers.DateTimeField(required=False, allow_null=True)
    error = serializers.CharField(required=False, allow_null=True, allow_blank=True)

class NotificationResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 
            'notification_type', 
            'user_id', 
            'template_code', 
            'request_id', 
            'priority', 
            'status', 
            'created_at'
        ]

class PaginationMetaSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    limit = serializers.IntegerField()
    page = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()

class APIResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    data = serializers.DictField(required=False, allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)
    message = serializers.CharField()
    meta = PaginationMetaSerializer(required=False, allow_null=True)
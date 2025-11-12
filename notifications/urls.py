from django.urls import path
from .views import NotificationView, update_notification_status

urlpatterns = [
    path('notifications/', NotificationView.as_view(), name='notifications'),
    path('notifications/<str:notification_type>/status/', update_notification_status, name='update-status'),
]
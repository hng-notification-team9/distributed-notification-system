from django.urls import path
from . import views

urlpatterns = [
    path('notifications/', views.create_notification, name='create-notification'),
    path('notifications/', views.list_notifications, name='list-notifications'),
    path('notifications/<str:notification_type>/status/', views.update_notification_status, name='update-status'),
]
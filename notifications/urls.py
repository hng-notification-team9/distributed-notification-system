from django.urls import path
from .views import (
    NotificationView,
    NotificationStatusUpdateView,
    CircuitBreakerStatusView,
    CircuitBreakerResetView,
    CircuitBreakerSimulateFailureView
)
from .views import NotificationStatusUpdateView

urlpatterns = [
    path('notifications/', NotificationView.as_view(), name='notifications'),
    path(
        'notifications/<str:notification_type>/status/',
        NotificationStatusUpdateView.as_view(),
        name='update_notification_status'
    ),

    path('circuit-breakers/status/', CircuitBreakerStatusView.as_view(), name='circuit-breaker-status'),
    path('circuit-breakers/<str:breaker_name>/reset/', CircuitBreakerResetView.as_view(), name='circuit-breaker-reset'),
    path('circuit-breakers/<str:breaker_name>/simulate-failure/', CircuitBreakerSimulateFailureView.as_view(), name='circuit-breaker-simulate-failure'),
]
from django.urls import path
from .views import (
    NotificationView, 
    circuit_breaker_status,
    reset_circuit_breaker,
    simulate_failure
)
from .views import NotificationStatusUpdateView

urlpatterns = [
    path('notifications/', NotificationView.as_view(), name='notifications'),
    path(
        'notifications/<str:notification_type>/status/',
        NotificationStatusUpdateView.as_view(),
        name='update_notification_status'
    ),

    path('circuit-breakers/', circuit_breaker_status, name='circuit-breaker-status'),
    path('circuit-breakers/<str:breaker_name>/reset/', reset_circuit_breaker, name='reset-circuit-breaker'),
    path('circuit-breakers/<str:breaker_name>/simulate-failure/', simulate_failure, name='simulate-failure'),
]
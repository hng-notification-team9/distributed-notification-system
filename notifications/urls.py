from django.urls import path
from .views import (
    NotificationView, 
    update_notification_status,
    circuit_breaker_status,
    reset_circuit_breaker,
    simulate_failure
)

urlpatterns = [
    path('notifications/', NotificationView.as_view(), name='notifications'),
    path('notifications/<str:notification_type>/status/', update_notification_status, name='update-status'),

    path('circuit-breakers/', circuit_breaker_status, name='circuit-breaker-status'),
    path('circuit-breakers/<str:breaker_name>/reset/', reset_circuit_breaker, name='reset-circuit-breaker'),
    path('circuit-breakers/<str:breaker_name>/simulate-failure/', simulate_failure, name='simulate-failure'),
]
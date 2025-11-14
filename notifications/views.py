import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.exceptions import ObjectDoesNotExist
from .models import Notification
from .serializers import (
    NotificationCreateSerializer,
    NotificationStatusUpdateSerializer,
    NotificationResponseSerializer,
    APIResponseSerializer,
    PaginationMetaSerializer
)
from .services import NotificationService, circuit_breaker_manager, CircuitBreakerError
from rest_framework.throttling import UserRateThrottle
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

logger = logging.getLogger('notifications')


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': data,
            'message': 'Notifications retrieved successfully',
            'meta': {
                'total': self.page.paginator.count,
                'limit': self.get_page_size(self.request),
                'page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
                'has_next': self.page.has_next(),
                'has_previous': self.page.has_previous(),
            }
        })


class NotificationThrottle(UserRateThrottle):
    rate = '1000/hour'


class NotificationView(APIView):
    throttle_classes = [NotificationThrottle]
    
    def get(self, request):
        try:
            paginator = NotificationPagination()
            notifications = Notification.objects.all().order_by('-created_at')
            result_page = paginator.paginate_queryset(notifications, request)
            
            serializer = NotificationResponseSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)
            
        except Exception as e:
            logger.error("Error listing notifications: %s", str(e))
            return Response(
                APIResponseSerializer({
                    'success': False,
                    'error': 'Internal server error',
                    'message': 'Failed to retrieve notifications'
                }).data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        try:
            serializer = NotificationCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    APIResponseSerializer({
                        'success': False,
                        'error': 'Validation failed',
                        'message': 'Invalid request data',
                        'data': serializer.errors
                    }).data,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            data = serializer.validated_data
            request_id = data['request_id']
            
            notification_service = NotificationService()
            existing_response = notification_service.check_idempotency(request_id)
            if existing_response:
                logger.info("Idempotent request detected: %s", request_id)
                return Response(existing_response)
            
            success = notification_service.send_notification(data)
            
            if success:
                response_data = APIResponseSerializer({
                    'success': True,
                    'data': {
                        'notification_id': data['request_id'],
                        'status': 'queued'
                    },
                    'message': 'Notification queued successfully'
                }).data
            
                notification_service.store_idempotency_key(request_id, response_data)
                
                return Response(response_data, status=status.HTTP_202_ACCEPTED)
            else:
                return Response(
                    APIResponseSerializer({
                        'success': False,
                        'error': 'Service unavailable',
                        'message': 'Failed to queue notification. Service may be temporarily unavailable.'
                    }).data,
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
                
        except Exception as e:
            logger.error("Error creating notification: %s", str(e))
            return Response(
                APIResponseSerializer({
                    'success': False,
                    'error': 'Internal server error',
                    'message': 'An error occurred while processing your request'
                }).data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class NotificationStatusUpdateView(APIView):
    @swagger_auto_schema(
        request_body=NotificationStatusUpdateSerializer,
        responses={200: APIResponseSerializer()},
        manual_parameters=[
            openapi.Parameter(
                'notification_type',
                openapi.IN_PATH,
                description="Notification type (email or push)",
                type=openapi.TYPE_STRING,
                required=True
            )
        ]
    )
    def post(self, request, notification_type):
        serializer = NotificationStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'success': False,
                    'error': 'Validation failed',
                    'message': 'Invalid status update data',
                    'data': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        notification_id = data['notification_id']
        
        try:
            notification = Notification.objects.get(request_id=notification_id)
            notification.status = data['status']
            notification.save()
            
            logger.info("Notification %s status updated to %s", notification_id, data['status'])
            
            return Response({
                'success': True,
                'message': 'Status updated successfully'
            })
            
        except ObjectDoesNotExist:
            return Response({
                'success': False,
                'error': 'Not found',
                'message': 'Notification not found'
            }, status=status.HTTP_404_NOT_FOUND)



@api_view(['GET'])
def circuit_breaker_status(request):
    """Get current status of all circuit breakers"""
    states = circuit_breaker_manager.get_all_states()
    
    return Response({
        'success': True,
        'data': states,
        'message': 'Circuit breaker status retrieved successfully'
    })


@api_view(['POST'])
def reset_circuit_breaker(request, breaker_name):
    """Reset a specific circuit breaker"""
    try:
        circuit_breaker_manager.reset_breaker(breaker_name)
        return Response({
            'success': True,
            'message': f'Circuit breaker {breaker_name} reset successfully'
        })
    except KeyError:
        return Response({
            'success': False,
            'error': 'Not found',
            'message': f'Circuit breaker {breaker_name} not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def simulate_failure(request, breaker_name):
    """Simulate failures to test circuit breaker (for testing only)"""
    from django.conf import settings
    
    if not settings.DEBUG:
        return Response({
            'success': False,
            'error': 'Not allowed',
            'message': 'Failure simulation only allowed in DEBUG mode'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        breaker = circuit_breaker_manager.get_breaker(breaker_name)
       
        for i in range(breaker.failure_threshold + 1):
            try:
                breaker.call(lambda: 1/0)  
            except (CircuitBreakerError, ZeroDivisionError):
                pass
        
        return Response({
            'success': True,
            'message': f'Simulated failures for {breaker_name}. Circuit breaker should be OPEN now.',
            'data': breaker.get_state()
        })
    except KeyError:
        return Response({
            'success': False,
            'error': 'Not found', 
            'message': f'Circuit breaker {breaker_name} not found'
        }, status=status.HTTP_404_NOT_FOUND)
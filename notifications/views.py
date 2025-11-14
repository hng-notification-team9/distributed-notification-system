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
from drf_spectacular.utils import extend_schema, OpenApiExample

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
    
    @swagger_auto_schema(
        operation_description="Create a new notification",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['notification_type', 'user_id', 'template_code', 'variables', 'request_id'],
            properties={
                'notification_type': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=['email', 'push'],
                    description="Type of notification to send"
                ),
                'user_id': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_UUID,
                    description="Unique identifier for the user"
                ),
                'template_code': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Template code for the notification"
                ),
                'variables': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'name': openapi.Schema(type=openapi.TYPE_STRING),
                        'link': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_URI),
                        'meta': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Optional metadata"
                        )
                    },
                    required=['name', 'link'],
                    description="Variables to substitute in the template"
                ),
                'request_id': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Unique request ID for idempotency"
                ),
                'priority': openapi.Schema(
                    type=openapi.TYPE_INTEGER,
                    minimum=1,
                    maximum=10,
                    default=1,
                    description="Notification priority (1-10)"
                ),
                'metadata': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    description="Optional additional metadata"
                )
            },
            example={
                "notification_type": "email",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "template_code": "welcome_email",
                "variables": {
                    "name": "John Doe",
                    "link": "https://example.com/verify",
                    "meta": {"source": "web"}
                },
                "request_id": "req_123456789",
                "priority": 1,
                "metadata": {"campaign": "welcome"}
            }
        ),
        responses={
            202: openapi.Response(
                'Success',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'data': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'notification_id': openapi.Schema(type=openapi.TYPE_STRING),
                                'status': openapi.Schema(type=openapi.TYPE_STRING)
                            }
                        ),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                ),
                examples={
                    'application/json': {
                        "success": True,
                        "data": {
                            "notification_id": "req_123456789",
                            "status": "queued"
                        },
                        "message": "Notification queued successfully"
                    }
                }
            ),
            400: openapi.Response(
                'Validation Error',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'error': openapi.Schema(type=openapi.TYPE_STRING),
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'data': openapi.Schema(type=openapi.TYPE_OBJECT)
                    }
                )
            ),
            503: openapi.Response(
                'Service Unavailable',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'error': openapi.Schema(type=openapi.TYPE_STRING),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            )
        }
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

    @swagger_auto_schema(
        operation_description="List all notifications with pagination",
        manual_parameters=[
            openapi.Parameter(
                'page',
                openapi.IN_QUERY,
                description="Page number",
                type=openapi.TYPE_INTEGER,
                default=1
            ),
            openapi.Parameter(
                'limit',
                openapi.IN_QUERY,
                description="Number of items per page",
                type=openapi.TYPE_INTEGER,
                default=20
            )
        ],
        responses={
            200: openapi.Response(
                'Success',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'data': openapi.Schema(
                            type=openapi.TYPE_ARRAY,
                            items=openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                properties={
                                    'id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
                                    'notification_type': openapi.Schema(type=openapi.TYPE_STRING),
                                    'user_id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
                                    'template_code': openapi.Schema(type=openapi.TYPE_STRING),
                                    'request_id': openapi.Schema(type=openapi.TYPE_STRING),
                                    'priority': openapi.Schema(type=openapi.TYPE_INTEGER),
                                    'status': openapi.Schema(type=openapi.TYPE_STRING),
                                    'created_at': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME)
                                }
                            )
                        ),
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'meta': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'total': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'limit': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'page': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'total_pages': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'has_next': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                                'has_previous': openapi.Schema(type=openapi.TYPE_BOOLEAN)
                            }
                        )
                    }
                )
            )
        }
    )
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



class NotificationStatusUpdateView(APIView):
    @extend_schema(
        request=NotificationStatusUpdateSerializer,
        examples=[
            OpenApiExample(
                'Status Update Example',
                value={
                    "notification_id": "req_123456789",
                    "status": "delivered",
                    "timestamp": "2024-01-15T10:35:00Z",
                    "error": None
                },
                request_only=True
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



class CircuitBreakerStatusView(APIView):
    """Get current status of all circuit breakers"""
    
    @swagger_auto_schema(
        operation_description="Get current status of all circuit breakers",
        responses={
            200: openapi.Response(
                'Success',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'data': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            additional_properties=openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                properties={
                                    'state': openapi.Schema(type=openapi.TYPE_STRING),
                                    'failure_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                                    'last_failure_time': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME),
                                    'next_retry_time': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME)
                                }
                            )
                        ),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            )
        }
    )
    def get(self, request):
        states = circuit_breaker_manager.get_all_states()
        
        return Response({
            'success': True,
            'data': states,
            'message': 'Circuit breaker status retrieved successfully'
        })


class CircuitBreakerResetView(APIView):
    """Reset a specific circuit breaker"""
    
    @swagger_auto_schema(
        operation_description="Reset a specific circuit breaker",
        responses={
            200: openapi.Response(
                'Success',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            404: openapi.Response(
                'Not Found',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'error': openapi.Schema(type=openapi.TYPE_STRING),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            )
        }
    )
    def post(self, request, breaker_name):
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


class CircuitBreakerSimulateFailureView(APIView):
    """Simulate failures to test circuit breaker (for testing only)"""
    
    @swagger_auto_schema(
        operation_description="Simulate failures to test circuit breaker (for testing only)",
        responses={
            200: openapi.Response(
                'Success',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'data': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'state': openapi.Schema(type=openapi.TYPE_STRING),
                                'failure_count': openapi.Schema(type=openapi.TYPE_INTEGER),
                                'last_failure_time': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME),
                                'next_retry_time': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME)
                            }
                        )
                    }
                )
            ),
            403: openapi.Response(
                'Forbidden',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'error': openapi.Schema(type=openapi.TYPE_STRING),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            ),
            404: openapi.Response(
                'Not Found',
                openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'error': openapi.Schema(type=openapi.TYPE_STRING),
                        'message': openapi.Schema(type=openapi.TYPE_STRING)
                    }
                )
            )
        }
    )
    def post(self, request, breaker_name):
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